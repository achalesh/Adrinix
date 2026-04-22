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
    global $conn;
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

    return $company;
}
?>