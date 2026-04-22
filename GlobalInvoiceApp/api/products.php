<?php
// api/products.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch all products for this user, joining tax profile label
    $stmt = $conn->prepare("
        SELECT p.*, tp.label AS tax_label, tp.rate_percentage AS tax_rate
        FROM products p
        LEFT JOIN tax_profiles tp ON p.tax_profile_id = tp.id
        WHERE p.user_id = ? AND p.company_id = ?
        ORDER BY p.category ASC, p.name ASC
    ");
    $stmt->bind_param("ii", $user_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    $stmt->close();
    echo json_encode(['status' => 'success', 'data' => $products]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
        exit;
    }

    $action = $data['action'] ?? 'create';

    // ── DELETE ──────────────────────────────────────────────────
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM products WHERE id = ? AND user_id = ? AND company_id = ?");
        $stmt->bind_param("iii", $id, $user_id, $company_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product deleted']);
        exit;
    }

    // ── TOGGLE ACTIVE ────────────────────────────────────────────
    if ($action === 'toggle') {
        $id = (int)($data['id'] ?? 0);
        $stmt = $conn->prepare("UPDATE products SET is_active = !is_active WHERE id = ? AND user_id = ? AND company_id = ?");
        $stmt->bind_param("iii", $id, $user_id, $company_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product status toggled']);
        exit;
    }

    // ── CREATE or UPDATE ─────────────────────────────────────────
    $name        = trim($data['name'] ?? '');
    $description = trim($data['description'] ?? '');
    $unit_price  = (float)($data['unit_price'] ?? 0);
    $unit        = trim($data['unit'] ?? 'item');
    $category    = trim($data['category'] ?? '');
    $tax_id      = !empty($data['tax_profile_id']) ? (int)$data['tax_profile_id'] : null;

    if (!$name) {
        echo json_encode(['status' => 'error', 'message' => 'Product name is required']);
        exit;
    }

    if (!empty($data['id'])) {
        // UPDATE
        $id = (int)$data['id'];
        $stmt = $conn->prepare("
            UPDATE products
            SET name=?, description=?, unit_price=?, unit=?, category=?, tax_profile_id=?, tax_method=?
            WHERE id=? AND user_id=? AND company_id=?
        ");
        $tax_method = $data['tax_method'] ?? 'exclusive';
        $stmt->bind_param("ssdsssiiii", $name, $description, $unit_price, $unit, $category, $tax_id, $tax_method, $id, $user_id, $company_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product updated']);
    } else {
        // CREATE
        $stmt = $conn->prepare("
            INSERT INTO products (user_id, company_id, name, description, unit_price, unit, category, tax_profile_id, tax_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $tax_method = $data['tax_method'] ?? 'exclusive';
        $stmt->bind_param("iissdssis", $user_id, $company_id, $name, $description, $unit_price, $unit, $category, $tax_id, $tax_method);
        $stmt->execute();
        $new_id = $conn->insert_id;
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product created', 'id' => $new_id]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
?>
