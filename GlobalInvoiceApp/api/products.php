<?php
// api/products.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

$productsTable = t('products');
$taxTable = t('tax_profiles');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch all products for this user in this tenant, joining tax profile label
    $stmt = $conn->prepare("
        SELECT p.*, tp.name AS tax_label, tp.percentage AS tax_rate
        FROM `{$productsTable}` p
        LEFT JOIN `{$taxTable}` tp ON p.tax_profile_id = tp.id
        WHERE p.user_id = ?
        ORDER BY p.category ASC, p.name ASC
    ");
    $stmt->bind_param("i", $user_id);
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
        $stmt = $conn->prepare("DELETE FROM `{$productsTable}` WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $id, $user_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product deleted']);
        exit;
    }

    // ── CREATE or UPDATE ─────────────────────────────────────────
    $name        = trim($data['name'] ?? '');
    $description = trim($data['description'] ?? '');
    $base_price  = (float)($data['unit_price'] ?? 0); // Note: frontend uses unit_price, backend schema uses base_price
    $category    = trim($data['category'] ?? '');
    // Wait, the table schema for products in my template was:
    // name, description, base_price, category
    // but the existing one had unit_price, unit, tax_profile_id, tax_method.
    // I will use my NEW schema from ensureTenantSchema.
    
    if (!$name) {
        echo json_encode(['status' => 'error', 'message' => 'Product name is required']);
        exit;
    }

    if (!empty($data['id'])) {
        // UPDATE
        $id = (int)$data['id'];
        $stmt = $conn->prepare("
            UPDATE `{$productsTable}`
            SET name=?, description=?, base_price=?, category=?
            WHERE id=? AND user_id=?
        ");
        $stmt->bind_param("ssdsii", $name, $description, $base_price, $category, $id, $user_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Product updated']);
    } else {
        // CREATE
        $stmt = $conn->prepare("
            INSERT INTO `{$productsTable}` (user_id, name, description, base_price, category)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("isssd", $user_id, $name, $description, $base_price, $category);
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
