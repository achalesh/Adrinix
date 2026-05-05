<?php
// api/search.php
require_once 'db.php';

// authenticate() returns the full JWT payload, not just user_id
$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);

$q = $_GET['q'] ?? '';
if (strlen($q) < 2) {
    echo json_encode(['status' => 'success', 'results' => []]);
    exit;
}

$results = [];
$search = "%$q%";

// 1. Search Invoices (scoped to this user's data)
$invoicesTable = t('invoices');
$clientsTable = t('clients');
$stmt = $conn->prepare("
    SELECT i.id, i.invoice_number, c.name as client_name 
    FROM `{$invoicesTable}` i
    LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
    WHERE i.user_id = ? AND (i.invoice_number LIKE ? OR c.name LIKE ?)
    LIMIT 5
");
$stmt->bind_param("iss", $user_id, $search, $search);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $results[] = [
        'type' => 'invoice',
        'id' => $row['id'],
        'title' => $row['invoice_number'],
        'subtitle' => "Client: " . ($row['client_name'] ?? 'Unknown'),
        'link' => "/invoices/{$row['id']}"
    ];
}
$stmt->close();

// 2. Search Clients (scoped to this user's data)
$stmt = $conn->prepare("
    SELECT id, name, email FROM `{$clientsTable}` 
    WHERE user_id = ? AND (name LIKE ? OR email LIKE ?)
    LIMIT 5
");
$stmt->bind_param("iss", $user_id, $search, $search);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $results[] = [
        'type' => 'client',
        'id' => $row['id'],
        'title' => $row['name'],
        'subtitle' => $row['email'],
        'link' => "/clients"
    ];
}
$stmt->close();

echo json_encode([
    'status' => 'success',
    'results' => $results
]);
