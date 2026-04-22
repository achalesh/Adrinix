<?php
// api/db.php

/**
 * Polyfill for getallheaders() if not running on Apache
 */
if (!function_exists('getallheaders')) {
    function getallheaders() {
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
 * This prevents the frontend from crashing on raw PHP errors.
 */
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Backend Exception: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
});

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return false;
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

// ─── UPDATE THESE FOR YOUR LIVE HOSTING ─────────────────────────────────────
$host = 'localhost';
$db_name = 'adrinix_db'; // Update this for production
$username = 'adrinix_user'; // Update this for production
$password = 'Adrinix**99'; // Update this for production
// ────────────────────────────────────────────────────────────────────────────

$conn = new mysqli($host, $username, $password, $db_name);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed. Check db.php credentials.']);
    exit();
}
$conn->set_charset("utf8mb4");

// Multi-tenant prefix
$t_prefix = "";

/**
 * Returns the prefixed table name for the specific tenant.
 * Example: t('invoices') -> 'c1_invoices'
 */
function t($table) {
    global $t_prefix;
    return $t_prefix . $table;
}

/**
 * Lazily creates the company-specific tables if they don't exist.
 */
function ensureTenantSchema($conn, $company_id) {
    $prefix = "c" . $company_id . "_";
    
    // Check if invoices exists first
    $res = $conn->query("SHOW TABLES LIKE '{$prefix}invoices'");
    if ($res->num_rows > 0) return;

    // Provisioning SQL Template
    $sql = "
    CREATE TABLE IF NOT EXISTS `{$prefix}tax_profiles` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `name` VARCHAR(100) NOT NULL,
      `percentage` DECIMAL(5,2) NOT NULL,
      `description` TEXT,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS `{$prefix}clients` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `name` VARCHAR(255) NOT NULL,
      `email` VARCHAR(255),
      `phone` VARCHAR(50),
      `billing_address` TEXT,
      `shipping_address` TEXT,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS `{$prefix}products` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `name` VARCHAR(255) NOT NULL,
      `description` TEXT,
      `base_price` DECIMAL(15,2) NOT NULL,
      `category` VARCHAR(100),
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS `{$prefix}invoices` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `client_id` INT,
      `invoice_number` VARCHAR(50) NOT NULL,
      `status` ENUM('Draft', 'Sent', 'Paid', 'Overdue') DEFAULT 'Draft',
      `issue_date` DATE NOT NULL,
      `due_date` DATE,
      `subtotal` DECIMAL(15,2) NOT NULL,
      `tax_total` DECIMAL(15,2) NOT NULL,
      `grand_total` DECIMAL(15,2) NOT NULL,
      `notes` TEXT,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (`client_id`) REFERENCES `{$prefix}clients`(`id`) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS `{$prefix}invoice_items` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `invoice_id` INT NOT NULL,
      `description` TEXT NOT NULL,
      `quantity` INT NOT NULL,
      `unit_price` DECIMAL(15,2) NOT NULL,
      `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive',
      `tax_profile_id` INT DEFAULT NULL,
      FOREIGN KEY (`invoice_id`) REFERENCES `{$prefix}invoices`(`id`) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS `{$prefix}team_members` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `email` VARCHAR(255) NOT NULL UNIQUE,
      `password_hash` VARCHAR(255) NOT NULL,
      `name` VARCHAR(100) NOT NULL,
      `role` ENUM('Admin', 'Manager', 'Viewer') DEFAULT 'Viewer',
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";

    // Multi-query execution
    $conn->multi_query($sql);
    while ($conn->next_result()) {;} // Flush multi-query results
}


// Authentication Middleware
$secret_key = "adrinix_super_secret_jwt_key_2026";

function authenticate()
{
    global $secret_key;
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) == 3) {
            $header = base64_decode($tokenParts[0]);
            $payload = base64_decode($tokenParts[1]);
            $signature_provided = $tokenParts[2];

            $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
            $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
            $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret_key, true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

            if (hash_equals($base64UrlSignature, $signature_provided)) {
                $payloadData = json_decode($payload, true);
                if ($payloadData['exp'] >= time()) {
                    return $payloadData; // Valid Token
                }
            }
        }
    }

    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

/**
 * Ensures the company exists and belongs to the user.
 * Returns the company row.
 */
function requireCompany($user_id)
{
    global $conn, $t_prefix;
    $headers = getallheaders();
    $company_id = (int) ($headers['X-Company-Id'] ?? 0);

    if (!$company_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing Company ID header']);
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM companies WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $company_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $company = $result->fetch_assoc();
    $stmt->close();

    if (!$company) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Invalid company access']);
        exit();
    }

    // Set Tenant Context
    $t_prefix = "c" . $company_id . "_";
    ensureTenantSchema($conn, $company_id);

    return $company;
}
?>