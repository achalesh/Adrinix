<?php
// api/activity_logs.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$cid = $company['id'];
$logsTable = "c" . $cid . "_activity_logs";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res_type = $_GET['resource_type'] ?? null;
    $res_id = (int)($_GET['resource_id'] ?? 0);
    $limit = (int)($_GET['limit'] ?? 50);

    $query = "
        SELECT l.*, u.name AS user_name, u.email AS user_email
        FROM `{$logsTable}` l
        JOIN users u ON l.user_id = u.id
    ";

    $params = [];
    $types = "";

    if ($res_type && $res_id) {
        $query .= " WHERE l.resource_type = ? AND l.resource_id = ?";
        $params[] = $res_type;
        $params[] = $res_id;
        $types .= "si";
    }

    $query .= " ORDER BY l.created_at DESC LIMIT ?";
    $params[] = $limit;
    $types .= "i";

    $stmt = $conn->prepare($query);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $logs = [];
    while($row = $res->fetch_assoc()) { $logs[] = $row; }
    $stmt->close();

    echo json_encode(['status' => 'success', 'data' => $logs]);
}
?>
