<?php
// api/db.php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

/**
 * Polyfill for getallheaders() if not running on Apache
 */
if (!function_exists('getallheaders')) {
    function getallheaders()
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

/**
 * Global Error/Exception Handlers for JSON Output
 */
set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Backend Exception: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
});

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno))
        return false;
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// Enable mysqli exceptions for cleaner error catching
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-Id");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// ─── DB CONFIG ──────────────────────────────────────────────────────────────
$host = 'localhost';
$db_name = 'adrinix_db';
$username = 'adrinix_user';
$password = 'Adrinix**99';
// ────────────────────────────────────────────────────────────────────────────

$conn = new mysqli($host, $username, $password, $db_name);
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed.']));
}
$conn->set_charset("utf8mb4");

$t_prefix = "";

function t($table)
{
    global $t_prefix;
    return $t_prefix . $table;
}

function ensureTenantSchema($conn, $company_id)
{
    $prefix = "c" . $company_id . "_";
    $res = $conn->query("SHOW TABLES LIKE '{$prefix}tax_profiles'");
    
    if ($res->num_rows == 0) {
        $sql = "
        CREATE TABLE IF NOT EXISTS `{$prefix}tax_profiles` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL, percentage DECIMAL(5,2) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS `{$prefix}clients` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), billing_address TEXT, shipping_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS `{$prefix}products` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, base_price DECIMAL(15,2) NOT NULL, category VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS `{$prefix}invoices` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, client_id INT, invoice_number VARCHAR(50) NOT NULL, status ENUM('Draft', 'Sent', 'Paid', 'Overdue') DEFAULT 'Draft', template VARCHAR(50) DEFAULT 'minimal', issue_date DATE NOT NULL, due_date DATE, subtotal DECIMAL(15,2) NOT NULL, tax_total DECIMAL(15,2) NOT NULL, grand_total DECIMAL(15,2) NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (client_id) REFERENCES `{$prefix}clients`(id) ON DELETE SET NULL);
        CREATE TABLE IF NOT EXISTS `{$prefix}invoice_items` (id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, description TEXT NOT NULL, quantity INT NOT NULL, unit_price DECIMAL(15,2) NOT NULL, tax_method ENUM('exclusive', 'inclusive') DEFAULT 'exclusive', tax_profile_id INT DEFAULT NULL, FOREIGN KEY (invoice_id) REFERENCES `{$prefix}invoices`(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS `{$prefix}team_members` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL, role ENUM('Admin', 'Manager', 'Viewer') DEFAULT 'Viewer', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        ";
        $conn->multi_query($sql);
        while ($conn->next_result()) { ; }
    }

    // ─── ROBUST MIGRATION: Ensure all columns exist ───
    $required_columns = [
        'is_recurring' => "TINYINT(1) DEFAULT 0",
        'recurrence_period' => "ENUM('none', 'weekly', 'bi-weekly', 'monthly', 'yearly') DEFAULT 'none'",
        'next_generation_date' => "DATE DEFAULT NULL",
        'last_generated_date' => "DATE DEFAULT NULL",
        'recurrence_status' => "ENUM('active', 'paused', 'completed') DEFAULT 'active'",
        'auto_send' => "TINYINT(1) DEFAULT 0",
        'public_token' => "VARCHAR(64) UNIQUE",
        'payment_method' => "VARCHAR(50) DEFAULT NULL",
        'payment_date' => "DATE DEFAULT NULL",
        'type' => "ENUM('Invoice', 'Quotation') DEFAULT 'Invoice'",
        'client_notes' => "TEXT DEFAULT NULL"
    ];

    foreach ($required_columns as $col => $definition) {
        try {
            $check = $conn->query("SHOW COLUMNS FROM `{$prefix}invoices` LIKE '$col'");
            if ($check->num_rows == 0) {
                $conn->query("ALTER TABLE `{$prefix}invoices` ADD COLUMN $col $definition");
            }
        } catch (Exception $e) {
            error_log("Migration column $col failed: " . $e->getMessage());
        }
    }

    // Client Table Migrations
    try {
        $check = $conn->query("SHOW COLUMNS FROM `{$prefix}clients` LIKE 'tax_id'");
        if ($check->num_rows == 0) {
            $conn->query("ALTER TABLE `{$prefix}clients` ADD COLUMN tax_id VARCHAR(100) AFTER phone");
        }
    } catch (Exception $e) {
        error_log("Client migration failed: " . $e->getMessage());
    }

    // Patch any missing tokens immediately
    try {
        $conn->query("UPDATE `{$prefix}invoices` SET public_token = MD5(CONCAT(id, RAND())) WHERE public_token IS NULL OR public_token = ''");
    } catch (Exception $e) {
        error_log("Token patch failed: " . $e->getMessage());
    }
}

$secret_key = "adrinix_super_secret_jwt_key_2026";

function authenticate()
{
    global $secret_key;
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) == 3) {
            $payload = base64_decode($tokenParts[1]);
            $payloadData = json_decode($payload, true);
            if ($payloadData && isset($payloadData['exp']) && $payloadData['exp'] >= time()) {
                return $payloadData;
            }
        }
    }
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

function requireCompany($user_id)
{
    global $conn, $t_prefix;
    $headers = getallheaders();
    $company_id = (int) ($headers['X-Company-Id'] ?? $headers['x-company-id'] ?? 0);

    if (!$company_id) {
        http_response_code(400);
        die(json_encode(['status' => 'error', 'message' => 'Missing Company ID']));
    }

    $stmt = $conn->prepare("SELECT * FROM companies WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $company_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $company = $result->fetch_assoc();
    $stmt->close();

    if (!$company) {
        http_response_code(403);
        die(json_encode(['status' => 'error', 'message' => 'Invalid company access']));
    }

    $t_prefix = "c" . $company_id . "_";
    header("X-Tenant-Prefix: " . $t_prefix);
    ensureTenantSchema($conn, $company_id);
    return $company;
}
?>