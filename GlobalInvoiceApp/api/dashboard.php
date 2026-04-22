<?php
// api/dashboard.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$invoicesTable = t('invoices');
$clientsTable = t('clients');

// --- 1. Invoice Stats ---
$stmt = $conn->prepare("
    SELECT 
        COUNT(*) AS total_invoices,
        COALESCE(SUM(grand_total), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN grand_total ELSE 0 END), 0) AS paid_revenue,
        COALESCE(SUM(CASE WHEN status = 'Draft' THEN grand_total ELSE 0 END), 0) AS draft_revenue,
        COALESCE(SUM(CASE WHEN status = 'Overdue' THEN grand_total ELSE 0 END), 0) AS overdue_revenue,
        COALESCE(SUM(CASE WHEN status = 'Sent' THEN grand_total ELSE 0 END), 0) AS sent_revenue,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) AS paid_count,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft_count,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdue_count,
        COUNT(CASE WHEN status = 'Sent' THEN 1 END) AS sent_count
    FROM `{$invoicesTable}`
    WHERE user_id = ?
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stats = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Caste decimal strings to numbers
foreach(['total_revenue', 'paid_revenue', 'draft_revenue', 'overdue_revenue', 'sent_revenue'] as $key) {
    if (isset($stats[$key])) $stats[$key] = (float)$stats[$key];
}

// --- 2. Client Count ---
$stmt2 = $conn->prepare("SELECT COUNT(*) AS total_clients FROM `{$clientsTable}` WHERE user_id = ?");
$stmt2->bind_param("i", $user_id);
$stmt2->execute();
$clientStats = $stmt2->get_result()->fetch_assoc();
$stmt2->close();

// --- 3. Recent 5 Invoices with client name ---
$stmt3 = $conn->prepare("
    SELECT i.id, i.invoice_number, i.status, i.issue_date, i.due_date, i.grand_total,
           c.name AS client_name
    FROM `{$invoicesTable}` i
    LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
    LIMIT 5
");
$stmt3->bind_param("i", $user_id);
$stmt3->execute();
$recentResult = $stmt3->get_result();
$recentInvoices = [];
while ($row = $recentResult->fetch_assoc()) {
    $row['grand_total'] = (float)$row['grand_total'];
    $recentInvoices[] = $row;
}
$stmt3->close();

// --- 4. Monthly Revenue (last 6 months) ---
$stmt4 = $conn->prepare("
    SELECT 
        DATE_FORMAT(issue_date, '%b %Y') AS month_label,
        DATE_FORMAT(issue_date, '%Y-%m') AS month_key,
        COALESCE(SUM(grand_total), 0) AS revenue
    FROM `{$invoicesTable}`
    WHERE user_id = ? AND issue_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month_key, month_label
    ORDER BY month_key ASC
");
$stmt4->bind_param("i", $user_id);
$stmt4->execute();
$monthlyResult = $stmt4->get_result();
$monthlyRevenue = [];
while ($row = $monthlyResult->fetch_assoc()) {
    $row['revenue'] = (float)$row['revenue'];
    $monthlyRevenue[] = $row;
}
$stmt4->close();

echo json_encode([
    'status' => 'success',
    'data' => [
        'stats' => array_merge($stats, $clientStats),
        'recent_invoices' => $recentInvoices,
        'monthly_revenue' => $monthlyRevenue,
    ]
]);
?>
