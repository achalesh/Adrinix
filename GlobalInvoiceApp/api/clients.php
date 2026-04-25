<?php
// api/clients.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

$clientsTable = t('clients');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all clients with summary stats
    $invoicesTable = t('invoices');
    $stmt = $conn->prepare("
        SELECT c.id, c.name, c.email, c.phone, c.tax_id, c.billing_address, c.created_at,
               COUNT(i.id) as total_invoices,
               SUM(CASE WHEN i.status = 'Paid' THEN i.grand_total ELSE 0 END) as total_paid,
               SUM(CASE WHEN i.status != 'Paid' AND i.status != 'Draft' THEN i.grand_total ELSE 0 END) as total_pending
        FROM `{$clientsTable}` c
        LEFT JOIN `{$invoicesTable}` i ON c.id = i.client_id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.name ASC
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $clients = [];
    while($row = $result->fetch_assoc()) {
        $clients[] = $row;
    }
    
    echo json_encode(['status' => 'success', 'data' => $clients]);
}
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // ENFORCE RBAC: Viewers cannot modify data
    if (isset($authUser['role']) && $authUser['role'] === 'Viewer') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Viewers cannot modify data.']);
        exit;
    }
    
    if (isset($data['action']) && $data['action'] === 'delete') {
        // Delete Client
        $client_id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM `{$clientsTable}` WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $client_id, $user_id);
        
        if($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Client removed securely']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete client']);
        }
    } else {
        // Insert or Update Client
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $phone = $data['phone'] ?? '';
        $tax_id = $data['tax_id'] ?? '';
        $billing_address = $data['billing_address'] ?? '';
        
        if (!$name) {
            echo json_encode(['status' => 'error', 'message' => 'Client Name is required']);
            exit;
        }

        if (isset($data['id']) && $data['id']) {
            // Update Existing Client
            $stmt = $conn->prepare("UPDATE `{$clientsTable}` SET name = ?, email = ?, phone = ?, tax_id = ?, billing_address = ? WHERE id = ? AND user_id = ?");
            $stmt->bind_param("sssssii", $name, $email, $phone, $tax_id, $billing_address, $data['id'], $user_id);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Client updated successfully']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database error during update']);
            }
        } else {
            // Insert New Client
            $stmt = $conn->prepare("INSERT INTO `{$clientsTable}` (user_id, name, email, phone, tax_id, billing_address) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssss", $user_id, $name, $email, $phone, $tax_id, $billing_address);
            
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'New client securely created', 'client_id' => $conn->insert_id]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database error during insert']);
            }
        }
    }
}
?>
