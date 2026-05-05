<?php
// api/db.php

// ─── LOAD ENVIRONMENT ─────────────────────────────────────────────────────────
// Parse .env file for configuration. In production, use server-level env vars.
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!getenv($key)) {
            putenv("$key=$value");
        }
    }
}

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
// Controlled by DISPLAY_ERRORS env var. Default OFF for production safety.
$displayErrors = getenv('DISPLAY_ERRORS') === '1';
ini_set('display_errors', $displayErrors ? 1 : 0);
ini_set('display_startup_errors', $displayErrors ? 1 : 0);
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
 * In production, never expose internal file paths or line numbers.
 */
set_exception_handler(function ($e) {
    http_response_code(500);
    $response = ['status' => 'error', 'message' => 'An internal server error occurred.'];
    if (getenv('DISPLAY_ERRORS') === '1') {
        $response['debug_message'] = $e->getMessage();
        $response['debug_file'] = basename($e->getFile());
        $response['debug_line'] = $e->getLine();
    }
    echo json_encode($response);
    error_log("Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    exit;
});

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno))
        return false;
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// Enable mysqli exceptions for cleaner error catching
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Restrict to allowed origins instead of wildcard "*"
$allowedOriginsStr = getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost:5175';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($requestOrigin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $requestOrigin);
    header("Access-Control-Allow-Credentials: true");
} elseif (empty($requestOrigin)) {
    // Allow non-browser requests (e.g., Postman, cURL, server-to-server)
    // No ACAO header is sent, which is fine for non-browser clients
} else {
    // Unknown origin — allow read-only. Browsers will still block cookie/auth flows.
    header("Access-Control-Allow-Origin: " . $allowedOrigins[0]);
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-Id");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// ─── DB CONFIG (from environment) ─────────────────────────────────────────────
$host     = getenv('DB_HOST') ?: 'localhost';
$db_name  = getenv('DB_NAME') ?: 'adrinix_db';
$username = getenv('DB_USER') ?: 'adrinix_user';
$password = getenv('DB_PASS') ?: '';

$conn = new mysqli($host, $username, $password, $db_name);
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed.']));
}
$conn->set_charset("utf8mb4");

// ─── GLOBAL SCHEMA SETUP ──────────────────────────────────────────────────
try {
    $conn->query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, company_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    
    // Master Companies Table - ensure all expected columns exist
    $conn->query("CREATE TABLE IF NOT EXISTS companies (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    
    $compCols = [
        'country' => 'VARCHAR(100)',
        'address' => 'TEXT',
        'phone' => 'VARCHAR(50)',
        'email' => 'VARCHAR(255)',
        'logo' => 'LONGTEXT',
        'registration_number' => 'VARCHAR(100)',
        'default_template' => "VARCHAR(50) DEFAULT 'minimal'",
        'currency_code' => "VARCHAR(10) DEFAULT 'INR'",
        'locale' => "VARCHAR(10) DEFAULT 'en-IN'",
        'primary_color' => "VARCHAR(20) DEFAULT '#6366f1'",
        'accent_color' => "VARCHAR(20) DEFAULT '#818cf8'",
        'layout_density' => "VARCHAR(20) DEFAULT 'normal'",
        'stripe_publishable_key' => "VARCHAR(255)",
        'stripe_secret_key' => "VARCHAR(255)",
        'paypal_client_id' => "VARCHAR(255)",
        'paypal_secret' => "VARCHAR(255)",
        'stripe_enabled' => "TINYINT(1) DEFAULT 0",
        'paypal_enabled' => "TINYINT(1) DEFAULT 0",
        'custom_payment_link' => "TEXT",
        'schema_version' => "INT DEFAULT 0"
    ];
    foreach ($compCols as $col => $type) {
        $check = $conn->query("SHOW COLUMNS FROM companies LIKE '$col'");
        if ($check->num_rows == 0) {
            $conn->query("ALTER TABLE companies ADD COLUMN $col $type");
        }
    }

    $conn->query("CREATE TABLE IF NOT EXISTS team_members (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, company_id INT, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL, role ENUM('Owner', 'Admin', 'Editor', 'Finance', 'Viewer') DEFAULT 'Viewer', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS refresh_tokens (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, member_id INT DEFAULT NULL, token VARCHAR(255) NOT NULL, expires_at DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS password_resets (email VARCHAR(255) NOT NULL, token VARCHAR(64) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

    // Ensure company_id in team_members
    $check = $conn->query("SHOW COLUMNS FROM team_members LIKE 'company_id'");
    if ($check->num_rows == 0) {
        $conn->query("ALTER TABLE team_members ADD COLUMN company_id INT AFTER user_id");
    }

    // Update ENUM to include Finance
    $conn->query("ALTER TABLE team_members MODIFY COLUMN role ENUM('Owner', 'Admin', 'Editor', 'Finance', 'Viewer') DEFAULT 'Viewer'");
} catch (Exception $e) {
    error_log("Global Schema Error: " . $e->getMessage());
}

$t_prefix = "";

function t($table)
{
    global $t_prefix;
    return $t_prefix . $table;
}

function ensureTenantSchema($conn, $company_id)
{
    $prefix = "c" . $company_id . "_";

    // 1. Independent table creation (IF NOT EXISTS is safe)
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}tax_profiles` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL, percentage DECIMAL(5,2) NOT NULL, description TEXT, is_default TINYINT(1) DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}clients` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), tax_id VARCHAR(100), billing_address TEXT, contact_person VARCHAR(255), contact_designation VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}products` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, base_price DECIMAL(15,2) NOT NULL, category VARCHAR(100), unit VARCHAR(50) DEFAULT 'item', tax_profile_id INT, tax_method ENUM('exclusive', 'inclusive') DEFAULT 'exclusive', is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}invoices` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, client_id INT, invoice_number VARCHAR(100) NOT NULL, status ENUM('Draft','Sent','Paid','Overdue','Accepted','Declined') DEFAULT 'Draft', template VARCHAR(50) DEFAULT 'minimal', issue_date DATE, due_date DATE, subtotal DECIMAL(15,2) DEFAULT 0.00, tax_total DECIMAL(15,2) DEFAULT 0.00, grand_total DECIMAL(15,2) DEFAULT 0.00, notes TEXT, is_recurring TINYINT(1) DEFAULT 0, recurrence_period ENUM('none','weekly','bi-weekly','monthly','yearly') DEFAULT 'none', next_generation_date DATE, last_generated_date DATE, recurrence_status ENUM('active','paused','completed') DEFAULT 'active', auto_send TINYINT(1) DEFAULT 0, public_token VARCHAR(100), type ENUM('Invoice','Quotation') DEFAULT 'Invoice', parent_invoice_id INT, client_notes TEXT, payment_method VARCHAR(100), payment_date DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}invoice_items` (id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, description TEXT, quantity DECIMAL(15,2) DEFAULT 1.00, unit_price DECIMAL(15,2) DEFAULT 0.00, tax_method ENUM('exclusive', 'inclusive') DEFAULT 'exclusive', tax_profile_id INT)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}milestones` (id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, description TEXT, percentage DECIMAL(5,2), amount DECIMAL(15,2), status ENUM('Pending', 'Invoiced') DEFAULT 'Pending', generated_invoice_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}payments` (id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, amount DECIMAL(15,2), gateway ENUM('Stripe', 'PayPal', 'Manual'), transaction_id VARCHAR(255), status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}expenses` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, date DATE NOT NULL, description VARCHAR(255) NOT NULL, category VARCHAR(100), amount DECIMAL(15,2) NOT NULL, currency VARCHAR(3) DEFAULT 'USD', status VARCHAR(20) DEFAULT 'Paid', receipt_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    $conn->query("CREATE TABLE IF NOT EXISTS `{$prefix}activity_logs` (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, action VARCHAR(100) NOT NULL, resource_type VARCHAR(50), resource_id INT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

    // 2. Robust Migration: Add missing columns to existing tables
    $migrations = [
        'invoices' => [
            'type' => "ENUM('Invoice','Quotation') DEFAULT 'Invoice'",
            'client_notes' => "TEXT",
            'parent_invoice_id' => "INT",
            'is_recurring' => "TINYINT(1) DEFAULT 0",
            'recurrence_period' => "ENUM('none','weekly','bi-weekly','monthly','yearly') DEFAULT 'none'",
            'public_token' => "VARCHAR(100)",
            'payment_method' => "VARCHAR(100)",
            'payment_date' => "DATE",
            'currency_code' => "VARCHAR(3) DEFAULT 'USD'",
            'exchange_rate' => "DECIMAL(10,4) DEFAULT 1.0000"
        ],
        'clients' => [
            'contact_person' => "VARCHAR(255)",
            'contact_designation' => "VARCHAR(255)",
            'tax_id' => "VARCHAR(100)"
        ],
        'products' => [
            'unit' => "VARCHAR(50) DEFAULT 'item'",
            'tax_profile_id' => "INT",
            'tax_method' => "ENUM('exclusive', 'inclusive') DEFAULT 'exclusive'",
            'is_active' => "TINYINT(1) DEFAULT 1"
        ],
        'tax_profiles' => [
            'tax_number' => "VARCHAR(100)",
            'is_default' => "TINYINT(1) DEFAULT 0",
            'is_active' => "TINYINT(1) DEFAULT 1"
        ]
    ];

    foreach ($migrations as $table => $cols) {
        foreach ($cols as $col => $definition) {
            $check = $conn->query("SHOW COLUMNS FROM `{$prefix}{$table}` LIKE '$col'");
            if ($check->num_rows == 0) {
                $conn->query("ALTER TABLE `{$prefix}{$table}` ADD COLUMN `$col` $definition");
            }
        }
    }

    // Patch any missing tokens
    $conn->query("UPDATE `{$prefix}invoices` SET public_token = MD5(CONCAT(id, RAND())) WHERE public_token IS NULL OR public_token = ''");
}

// ─── JWT SECRET (from environment) ────────────────────────────────────────────
$secret_key = getenv('JWT_SECRET') ?: 'CHANGE_ME_IN_PRODUCTION_' . md5(__DIR__);

/**
 * Authenticate a request by verifying the JWT token.
 * CRITICAL: This now properly verifies the HMAC-SHA256 signature.
 */
function authenticate()
{
    global $secret_key;
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) == 3) {
            $header = $tokenParts[0];
            $payload = $tokenParts[1];
            $signatureProvided = $tokenParts[2];

            // ── VERIFY SIGNATURE ──────────────────────────────────────────
            // Recompute the expected signature from header.payload using the secret
            $expectedSignature = hash_hmac('sha256', $header . "." . $payload, $secret_key, true);
            $expectedBase64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSignature));

            if (!hash_equals($expectedBase64, $signatureProvided)) {
                // Signature mismatch — token was tampered with or forged
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Invalid token signature']);
                exit();
            }

            // ── DECODE AND VALIDATE PAYLOAD ───────────────────────────────
            $payloadData = json_decode(base64_decode($payload), true);
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
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    
    // Robust header detection
    $company_id = (int) (
        $headers['X-Company-Id'] ?? 
        $headers['x-company-id'] ?? 
        $_SERVER['HTTP_X_COMPANY_ID'] ?? 
        $_SERVER['HTTP_X_COMPANY_ID'] ?? 
        0
    );

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

    // OPTIMIZATION: Only run schema migration if version mismatch
    $currentSchemaVersion = 10; // Increment this whenever you add new migrations to ensureTenantSchema
    if (($company['schema_version'] ?? 0) < $currentSchemaVersion) {
        ensureTenantSchema($conn, $company_id);
        $conn->query("UPDATE companies SET schema_version = $currentSchemaVersion WHERE id = $company_id");
    }

    return $company;
}

/**
 * Log an activity to the tenant-specific activity_logs table.
 */
function logActivity($conn, $cid, $user_id, $action, $res_type = null, $res_id = null, $details = null) {
    $table = "c" . $cid . "_activity_logs";
    $stmt = $conn->prepare("INSERT INTO `{$table}` (user_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issis", $user_id, $action, $res_type, $res_id, $details);
    $stmt->execute();
    $stmt->close();
}
?>