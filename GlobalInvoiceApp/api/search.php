<?php
// api/search.php
require_once 'db.php';
require_once 'auth.php';

$user_id = authenticate();
$company = requireCompany($user_id);

$q = $_GET['q'] ?? '';
if (strlen($q) < 2) {
    echo json_encode(['status' => 'success', 'results' => []]);
    exit;
}

$results = [];
$search = "%$q%";

// 1. Search Invoices
$invoicesTable = t('invoices');
$clientsTable = t('clients');
$stmt = $conn->prepare("
    SELECT i.id, i.invoice_number, c.name as client_name 
    FROM `{$invoicesTable}` i
    LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
    WHERE i.invoice_number LIKE ? OR c.name LIKE ?
    LIMIT 5
");
$stmt->bind_param("ss", $search, $search);
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

// 2. Search Clients
$stmt = $conn->prepare("
    SELECT id, name, email FROM `{$clientsTable}` 
    WHERE name LIKE ? OR email LIKE ?
    LIMIT 5
");
$stmt->bind_param("ss", $search, $search);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $results[] = [
        'type' => 'client',
        'id' => $row['id'],
        'title' => $row['name'],
        'subtitle' => $row['email'],
        'link' => "/clients" // In this app, clients are managed in a list. If there was a single client view, I'd link there.
    ];
}
$stmt->close();

echo json_encode([
    'status' => 'success',
    'results' => $results
]);
