<?php
// api/expenses.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$cid = $company['id'];
$expTable = "c" . $cid . "_expenses";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare("SELECT * FROM `{$expTable}` WHERE user_id = ? ORDER BY date DESC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $expenses = [];
    while($row = $res->fetch_assoc()) { $expenses[] = $row; }
    $stmt->close();
    echo json_encode(['status' => 'success', 'data' => $expenses]);
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'create';

    if ($action === 'create') {
        $date = $data['date'] ?? date('Y-m-d');
        $desc = $data['description'] ?? '';
        $cat = $data['category'] ?? 'General';
        $amt = (float)($data['amount'] ?? 0);
        $curr = $data['currency'] ?? 'USD';
        $status = $data['status'] ?? 'Paid';
        $receipt = $data['receipt_url'] ?? '';

        $stmt = $conn->prepare("INSERT INTO `{$expTable}` (user_id, date, description, category, amount, currency, status, receipt_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssdsss", $user_id, $date, $desc, $cat, $amt, $curr, $status, $receipt);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Expense recorded', 'id' => $conn->insert_id]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to record expense']);
        }
        $stmt->close();
    } 
    elseif ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM `{$expTable}` WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $id, $user_id);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Expense deleted']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete expense']);
        }
        $stmt->close();
    }
}
?>
