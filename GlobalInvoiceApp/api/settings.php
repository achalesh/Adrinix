<?php
// api/settings.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
header("X-Adrinix-Debug: v2-prefixing-active");

$headers = getallheaders();
$active_company_id = 0;
foreach ($headers as $key => $val) {
    if (strcasecmp($key, 'X-Company-Id') === 0) {
        $active_company_id = (int)$val;
        break;
    }
}
if (!$active_company_id) {
    $active_company_id = (int)($_SERVER['HTTP_X_COMPANY_ID'] ?? $_SERVER['X_COMPANY_ID'] ?? 0);
}
if (!$active_company_id) $active_company_id = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'details';

    // 1. If explicit list requested OR no specific company requested, return list of companies
    if ($action === 'list' || !$active_company_id) {
        $stmt = $conn->prepare("SELECT id, name, logo, country, currency_code, locale, default_template FROM companies WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $companies = [];
        while($row = $res->fetch_assoc()) { 
            $companies[] = $row; 
        }
        $stmt->close();
        
        echo json_encode(['status' => 'success', 'data' => ['companies' => $companies]]);
        exit;
    }

    // 2. Fetch specific company details (Master DB)
    $company = requireCompany($user_id);
    $cid = $company['id'];
    $taxTable = "c" . $cid . "_tax_profiles";
    
    // 3. Fetch tax profiles (Tenant DB)
    $stmt = $conn->prepare("SELECT id, name AS label, percentage AS rate_percentage FROM `{$taxTable}` WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $tax_res = $stmt->get_result();
    $tax_profiles = [];
    while($row = $tax_res->fetch_assoc()) { 
        $row['is_default'] = false; // Simplified for now
        $tax_profiles[] = $row; 
    }
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
                'registrationNumber' => $company['registration_number'],
                'defaultTemplate' => $company['default_template'] ?? 'minimal',
                'primaryColor' => $company['primary_color'] ?? '#6366f1',
                'accentColor' => $company['accent_color'] ?? '#818cf8',
                'layoutDensity' => $company['layout_density'] ?? 'normal',
                'stripe_publishable_key' => $company['stripe_publishable_key'] ?? '',
                'stripe_secret_key' => $company['stripe_secret_key'] ?? '',
                'paypal_client_id' => $company['paypal_client_id'] ?? '',
                'paypal_secret' => $company['paypal_secret'] ?? '',
                'stripe_enabled' => (bool)($company['stripe_enabled'] ?? false),
                'paypal_enabled' => (bool)($company['paypal_enabled'] ?? false),
                'customPaymentLink' => $company['custom_payment_link'] ?? ''
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

    // ENFORCE RBAC: Only Owner and Admin can modify settings
    if (isset($authUser['role']) && !in_array($authUser['role'], ['Owner', 'Admin'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Only Admins can modify settings.']);
        exit;
    }

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
    $taxTable = "c" . $cid . "_tax_profiles"; // Explicit prefix to avoid global scope issues

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
        $c_tmpl = $data['company']['defaultTemplate'] ?? 'minimal';
        $c_prim = $data['company']['primaryColor'] ?? '#6366f1';
        $c_acc = $data['company']['accentColor'] ?? '#818cf8';
        $c_dens = $data['company']['layoutDensity'] ?? 'normal';
        $c_st_pub = $data['company']['stripe_publishable_key'] ?? '';
        $c_st_sec = $data['company']['stripe_secret_key'] ?? '';
        $c_pp_cid = $data['company']['paypal_client_id'] ?? '';
        $c_pp_sec = $data['company']['paypal_secret'] ?? '';
        $c_st_en = (int)($data['company']['stripe_enabled'] ?? 0);
        $c_pp_en = (int)($data['company']['paypal_enabled'] ?? 0);
        $c_pay_link = $data['company']['customPaymentLink'] ?? '';

        // Update Master DB
        $stmt = $conn->prepare("UPDATE companies SET name=?, address=?, phone=?, email=?, logo=?, country=?, registration_number=?, currency_code=?, locale=?, default_template=?, primary_color=?, accent_color=?, layout_density=?, stripe_publishable_key=?, stripe_secret_key=?, paypal_client_id=?, paypal_secret=?, stripe_enabled=?, paypal_enabled=?, custom_payment_link=? WHERE id=? AND user_id=?");
        $stmt->bind_param("sssssssssssssssssiisii", $c_name, $c_addr, $c_phone, $c_email, $c_logo, $c_country, $c_reg, $c_curr, $c_loc, $c_tmpl, $c_prim, $c_acc, $c_dens, $c_st_pub, $c_st_sec, $c_pp_cid, $c_pp_sec, $c_st_en, $c_pp_en, $c_pay_link, $cid, $user_id);
        $stmt->execute();
        $stmt->close();

        // Update Tax Profiles (Tenant DB)
        if (empty($taxTable) || $taxTable === 'tax_profiles') {
            throw new Exception("Security Error: Attempted to write to master tax table. Expected prefix missing.");
        }

        $delStmt = $conn->prepare("DELETE FROM `{$taxTable}` WHERE user_id = ?");
        $delStmt->bind_param("i", $user_id);
        $delStmt->execute();
        $delStmt->close();
        if (!empty($data['taxProfiles'])) {
            $stmt = $conn->prepare("INSERT INTO `{$taxTable}` (user_id, name, percentage) VALUES (?, ?, ?)");
            foreach ($data['taxProfiles'] as $profile) {
                $rate = (float)$profile['rate_percentage'];
                $label = $profile['label'] ?? 'Tax';
                $stmt->bind_param("isd", $user_id, $label, $rate);
                $stmt->execute();
            }
            $stmt->close();
        }

        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
?>
