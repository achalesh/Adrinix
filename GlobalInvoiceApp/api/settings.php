<?php
// api/settings.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];

$headers = getallheaders();
$active_company_id = isset($headers['X-Company-Id']) ? (int)$headers['X-Company-Id'] : null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'details';

    // Check if companies table exists first
    $check = $conn->query("SHOW TABLES LIKE 'companies'");
    if ($check->num_rows == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Database migration required. Please run the migration script or contact support.', 'needs_migration' => true]);
        exit;
    }

    // 1. If explicit list requested OR no specific company requested, return list of companies
    if ($action === 'list' || !$active_company_id) {
        $stmt = $conn->prepare("SELECT id, name, logo, country, currency_code, locale FROM companies WHERE user_id = ? ORDER BY created_at ASC");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $companies = [];
        while($row = $res->fetch_assoc()) { $companies[] = $row; }
        $stmt->close();
        
        echo json_encode(['status' => 'success', 'data' => ['companies' => $companies]]);
        exit;
    }

    // 2. Fetch specific company details
    $company = requireCompany($user_id);
    
    // 3. Fetch tax profiles for this company
    $stmt = $conn->prepare("SELECT id, label, rate_percentage, is_default FROM tax_profiles WHERE company_id = ?");
    $stmt->bind_param("i", $active_company_id);
    $stmt->execute();
    $tax_res = $stmt->get_result();
    $tax_profiles = [];
    while($row = $tax_res->fetch_assoc()) { $tax_profiles[] = $row; }
    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'company' => [
                'id' => $company['id'],
                'name' => $company['name'],
                'address' => $company['address'],
                'phone' => $company['phone'],
                'email' => $company['email'],
                'logo' => $company['logo'],
                'country' => $company['country'],
                'registrationNumber' => $company['registration_number']
            ],
            'localization' => [
                'currencyCode' => $company['currency_code'] ?? 'USD',
                'locale' => $company['locale'] ?? 'en-US'
            ],
            'taxProfiles' => $tax_profiles
        ]
    ]);
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['status' => 'error', 'message' => 'Invalid data']); exit; }

    $action = $data['action'] ?? 'update';

    if ($action === 'create') {
        $name = trim($data['name'] ?? 'New Company');
        $stmt = $conn->prepare("INSERT INTO companies (user_id, name) VALUES (?, ?)");
        $stmt->bind_param("is", $user_id, $name);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Company created', 'id' => $conn->insert_id]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to create company']);
        }
        $stmt->close();
        exit;
    }

    // UPDATE EXISTING COMPANY
    $company = requireCompany($user_id);
    $cid = $company['id'];

    $conn->begin_transaction();
    try {
        $c_name = $data['company']['name'] ?? '';
        $c_addr = $data['company']['address'] ?? '';
        $c_phone = $data['company']['phone'] ?? '';
        $c_email = $data['company']['email'] ?? '';
        $c_logo = $data['company']['logo'] ?? '';
        $c_country = $data['company']['country'] ?? 'United States';
        $c_reg = $data['company']['registrationNumber'] ?? '';
        $c_curr = $data['localization']['currencyCode'] ?? 'USD';
        $c_loc = $data['localization']['locale'] ?? 'en-US';

        $stmt = $conn->prepare("UPDATE companies SET name=?, address=?, phone=?, email=?, logo=?, country=?, registration_number=?, currency_code=?, locale=? WHERE id=? AND user_id=?");
        if (!$stmt) { throw new Exception("Prepare failed: " . $conn->error); }
        
        $stmt->bind_param("sssssssssii", $c_name, $c_addr, $c_phone, $c_email, $c_logo, $c_country, $c_reg, $c_curr, $c_loc, $cid, $user_id);
        if (!$stmt->execute()) { throw new Exception("Execute failed: " . $stmt->error); }
        $stmt->close();

        // Update Tax Profiles
        $conn->query("DELETE FROM tax_profiles WHERE company_id = $cid");
        foreach ($data['taxProfiles'] as $profile) {
            $stmt = $conn->prepare("INSERT INTO tax_profiles (company_id, label, rate_percentage, is_default) VALUES (?, ?, ?, ?)");
            if (!$stmt) { throw new Exception("Tax Prepare failed: " . $conn->error); }
            $rate = (float)$profile['rate_percentage'];
            $is_def = $profile['is_default'] ? 1 : 0;
            $stmt->bind_param("isdi", $cid, $profile['label'], $rate, $is_def);
            $stmt->execute();
            $stmt->close();
        }

        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Settings Update Error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
?>
