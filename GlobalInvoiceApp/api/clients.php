<?php
// api/clients.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all clients for the authorized user
    $stmt = $conn->prepare("SELECT id, name, email, phone, tax_id, billing_address, created_at FROM clients WHERE user_id = ? AND company_id = ? ORDER BY name ASC");
    $stmt->bind_param("ii", $user_id, $company_id);
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
    
    if (isset($data['action']) && $data['action'] === 'delete') {
        // Delete Client
        $client_id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM clients WHERE id = ? AND user_id = ? AND company_id = ?");
        $stmt->bind_param("iii", $client_id, $user_id, $company_id);
        
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
            $stmt = $conn->prepare("UPDATE clients SET name = ?, email = ?, phone = ?, tax_id = ?, billing_address = ? WHERE id = ? AND user_id = ? AND company_id = ?");
            $stmt->bind_param("sssssiii", $name, $email, $phone, $tax_id, $billing_address, $data['id'], $user_id, $company_id);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Client updated successfully']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database error during update']);
            }
        } else {
            // Insert New Client
            $stmt = $conn->prepare("INSERT INTO clients (user_id, company_id, name, email, phone, tax_id, billing_address) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisssss", $user_id, $company_id, $name, $email, $phone, $tax_id, $billing_address);
            
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'New client securely created', 'client_id' => $conn->insert_id]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database error during insert']);
            }
        }
    }
}
?>
