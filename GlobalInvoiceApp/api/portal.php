<?php
// api/portal.php
require_once 'db.php';

// Public access - no authenticate() call here.

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';
    $company_id = (int)($_GET['company_id'] ?? 0);

    if (!$token || !$company_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing parameters']);
        exit;
    }

    // 1. Fetch Company Info
    $stmt = $conn->prepare("SELECT name, address, phone, email, logo, currency_code, locale, registration_number FROM companies WHERE id = ?");
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $company = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$company) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Workspace not found']);
        exit;
    }

    // 2. Fetch Invoice by Public Token
    // We manually set the table prefix for this request
    $prefix = "c" . $company_id . "_";
    $invoicesTable = $prefix . "invoices";
    $clientsTable = $prefix . "clients";
    $itemsTable = $prefix . "invoice_items";

    $stmt = $conn->prepare("
        SELECT i.*, c.name AS client_name, c.email AS client_email,
               c.billing_address AS client_address
        FROM `{$invoicesTable}` i 
        LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
        WHERE i.public_token = ?
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Invoice link is invalid or expired']);
        exit;
    }

    // 3. Fetch Items
    $stmt2 = $conn->prepare("SELECT id, description, quantity, unit_price, tax_method, tax_profile_id FROM `{$itemsTable}` WHERE invoice_id = ?");
    $stmt2->bind_param("i", $invoice['id']);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $items = [];
    while ($row = $result2->fetch_assoc()) { $items[] = $row; }
    $stmt2->close();

    $invoice['items'] = $items;

    // Return combined data
    echo json_encode([
        'status' => 'success',
        'data' => [
            'invoice' => $invoice,
            'company' => $company
        ]
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $token = $data['token'] ?? '';
    $company_id = (int)($data['company_id'] ?? 0);
    $action = $data['action'] ?? '';
    $notes = $data['notes'] ?? '';

    if (!$token || !$company_id || !$action) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid portal action']);
        exit;
    }

    $prefix = "c" . $company_id . "_";
    $invoicesTable = $prefix . "invoices";

    if ($action === 'approve') {
        $signature = $data['signature'] ?? null;
        
        // Convert Quotation to Invoice and set status to Sent (awaiting payment)
        // Also update the invoice number to INV- format if it was QTN-
        $stmt = $conn->prepare("
            UPDATE `{$invoicesTable}` 
            SET type = 'Invoice', 
                status = 'Sent', 
                client_notes = NULL, 
                signature = ?,
                invoice_number = REPLACE(invoice_number, 'QTN-', 'INV-')
            WHERE public_token = ?
        ");
        $stmt->bind_param("ss", $signature, $token);
        if ($stmt->execute()) {
             echo json_encode(['status' => 'success', 'message' => 'Quotation approved! Your official invoice is now ready.']);
        } else {
             echo json_encode(['status' => 'error', 'message' => 'Failed to process approval']);
        }
    } elseif ($action === 'suggest_changes') {
        // Record client feedback and reset to Draft for workspace owner to review
        $stmt = $conn->prepare("UPDATE `{$invoicesTable}` SET client_notes = ?, status = 'Draft' WHERE public_token = ?");
        $stmt->bind_param("ss", $notes, $token);
        if ($stmt->execute()) {
             echo json_encode(['status' => 'success', 'message' => 'Thank you. Your feedback has been sent to our team.']);
        } else {
             echo json_encode(['status' => 'error', 'message' => 'Failed to submit feedback']);
        }
    }
    exit;
}
?>
