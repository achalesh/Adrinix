<?php
// api/payments.php
require_once 'db.php';

// Public access for creating sessions, but requires valid public_token for the invoice
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    $company_id = (int)($data['company_id'] ?? 0);
    $public_token = $data['public_token'] ?? '';

    if (!$action || !$company_id || !$public_token) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing parameters']);
        exit;
    }

    // 1. Get Company Payment Settings
    $stmt = $conn->prepare("SELECT stripe_secret_key, paypal_client_id, paypal_secret, currency_code FROM companies WHERE id = ?");
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $company = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$company) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Company not found']);
        exit;
    }

    // 2. Get Invoice
    $prefix = "c" . $company_id . "_";
    $invoicesTable = $prefix . "invoices";
    
    $stmt = $conn->prepare("SELECT id, grand_total, invoice_number, status FROM `{$invoicesTable}` WHERE public_token = ?");
    $stmt->bind_param("s", $public_token);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Invoice not found']);
        exit;
    }

    if ($invoice['status'] === 'Paid') {
        echo json_encode(['status' => 'error', 'message' => 'Invoice is already paid']);
        exit;
    }

    // 3. Handle Actions
    if ($action === 'create_stripe_session') {
        $secretKey = $company['stripe_secret_key'];
        if (!$secretKey) {
            echo json_encode(['status' => 'error', 'message' => 'Stripe is not configured']);
            exit;
        }

        $amount = (int)($invoice['grand_total'] * 100); // Stripe uses cents
        $currency = strtolower($company['currency_code'] ?: 'usd');
        
        $payload = http_build_query([
            'payment_method_types[]' => 'card',
            'line_items[0][price_data][currency]' => $currency,
            'line_items[0][price_data][product_data][name]' => "Invoice " . $invoice['invoice_number'],
            'line_items[0][price_data][unit_amount]' => $amount,
            'line_items[0][quantity]' => 1,
            'mode' => 'payment',
            'success_url' => $data['success_url'] . "?session_id={CHECKOUT_SESSION_ID}",
            'cancel_url' => $data['cancel_url'],
            'metadata[invoice_id]' => $invoice['id'],
            'metadata[company_id]' => $company_id
        ]);

        $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_USERPWD, $secretKey . ':');
        $response = curl_exec($ch);
        $resData = json_decode($response, true);
        curl_close($ch);

        if (isset($resData['id'])) {
            echo json_encode(['status' => 'success', 'id' => $resData['id'], 'url' => $resData['url']]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Stripe error: ' . ($resData['error']['message'] ?? 'Unknown error')]);
        }
    } 
    elseif ($action === 'verify_stripe_payment') {
        $sessionId = $data['session_id'] ?? '';
        $secretKey = $company['stripe_secret_key'];
        
        $ch = curl_init("https://api.stripe.com/v1/checkout/sessions/" . $sessionId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $secretKey . ':');
        $response = curl_exec($ch);
        $resData = json_decode($response, true);
        curl_close($ch);

        if (isset($resData['payment_status']) && $resData['payment_status'] === 'paid') {
            // Update Invoice Status
            $paymentDate = date('Y-m-d');
            $method = 'Stripe';
            
            $stmt = $conn->prepare("UPDATE `{$invoicesTable}` SET status = 'Paid', payment_method = ?, payment_date = ? WHERE id = ?");
            $stmt->bind_param("ssi", $method, $paymentDate, $invoice['id']);
            $stmt->execute();
            $stmt->close();

            // Record Payment
            $paymentsTable = $prefix . "payments";
            $stmt = $conn->prepare("INSERT INTO `{$paymentsTable}` (invoice_id, amount, gateway, transaction_id, status) VALUES (?, ?, 'Stripe', ?, 'Completed')");
            $amount = $invoice['grand_total'];
            $stmt->bind_param("idss", $invoice['id'], $amount, $resData['payment_intent']);
            $stmt->execute();
            $stmt->close();

            echo json_encode(['status' => 'success', 'message' => 'Payment verified successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Payment not completed']);
        }
    }
    elseif ($action === 'capture_paypal_payment') {
        $orderId = $data['order_id'] ?? '';
        $clientId = $company['paypal_client_id'];
        $secret = $company['paypal_secret'];
        
        // 1. Get Access Token
        $ch = curl_init("https://api-m.sandbox.paypal.com/v1/oauth2/token"); // Use sandbox for now, or detect from keys
        // Detection: live_ or sandbox_ prefix is common but not guaranteed by PayPal in keys anymore. 
        // We might want to add a 'paypal_mode' setting later.
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $secret);
        curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
        $response = curl_exec($ch);
        $tokenData = json_decode($response, true);
        curl_close($ch);
        
        $accessToken = $tokenData['access_token'] ?? '';
        if (!$accessToken) {
            echo json_encode(['status' => 'error', 'message' => 'PayPal authentication failed']);
            exit;
        }

        // 2. Capture Order
        $ch = curl_init("https://api-m.sandbox.paypal.com/v2/checkout/orders/$orderId/capture");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer $accessToken"
        ]);
        $response = curl_exec($ch);
        $resData = json_decode($response, true);
        curl_close($ch);

        if (isset($resData['status']) && $resData['status'] === 'COMPLETED') {
            $paymentDate = date('Y-m-d');
            $method = 'PayPal';
            
            $stmt = $conn->prepare("UPDATE `{$invoicesTable}` SET status = 'Paid', payment_method = ?, payment_date = ? WHERE id = ?");
            $stmt->bind_param("ssi", $method, $paymentDate, $invoice['id']);
            $stmt->execute();
            $stmt->close();

            // Record Payment
            $paymentsTable = $prefix . "payments";
            $stmt = $conn->prepare("INSERT INTO `{$paymentsTable}` (invoice_id, amount, gateway, transaction_id, status) VALUES (?, ?, 'PayPal', ?, 'Completed')");
            $amount = $invoice['grand_total'];
            $stmt->bind_param("idss", $invoice['id'], $amount, $orderId);
            $stmt->execute();
            $stmt->close();

            echo json_encode(['status' => 'success', 'message' => 'PayPal payment captured']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'PayPal capture failed: ' . ($resData['message'] ?? 'Unknown error')]);
        }
    }
}
?>
