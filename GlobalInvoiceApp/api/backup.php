<?php
// api/backup.php
require_once 'db.php';

// Security: Check for a secret key to prevent unauthorized backups
$backupKey = getenv('BACKUP_KEY') ?: 'adrinix_default_backup_secret';
$providedKey = $_GET['key'] ?? ($_SERVER['HTTP_X_BACKUP_KEY'] ?? '');

if ($providedKey !== $backupKey) {
    http_response_code(403);
    die(json_encode(['status' => 'error', 'message' => 'Unauthorized backup request']));
}

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'adrinix_db';
$db_user = getenv('DB_USER') ?: 'adrinix_user';
$db_pass = getenv('DB_PASS') ?: '';

$backupDir = __DIR__ . '/../backups/';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// Add .htaccess to protect the backup directory
$htaccess = $backupDir . '.htaccess';
if (!file_exists($htaccess)) {
    file_put_contents($htaccess, "Order Deny,Allow\nDeny from all");
}

$filename = 'backup_' . $db_name . '_' . date('Y-m-d_H-i-s') . '.sql';
$filePath = $backupDir . $filename;

// 1. Attempt Database Dump
$success = false;
$output = [];
$returnVar = -1;

// Try mysqldump first
$command = sprintf(
    'mysqldump --host=%s --user=%s --password=%s %s > %s',
    escapeshellarg($db_host),
    escapeshellarg($db_user),
    escapeshellarg($db_pass),
    escapeshellarg($db_name),
    escapeshellarg($filePath)
);

exec($command, $output, $returnVar);

if ($returnVar === 0) {
    $success = true;
} else {
    // Fallback: Pure PHP Dump (Simplified)
    $success = phpBackupFallback($conn, $filePath);
}

if ($success) {
    // 2. AWS S3 Upload (Optional)
    $s3Bucket = getenv('AWS_S3_BUCKET');
    $s3Region = getenv('AWS_S3_REGION');
    $s3Key = getenv('AWS_S3_KEY');
    $s3Secret = getenv('AWS_S3_SECRET');

    $s3Status = "Local Only";
    if ($s3Bucket && $s3Key && $s3Secret) {
        $uploadRes = uploadToS3($filePath, $filename, $s3Bucket, $s3Region, $s3Key, $s3Secret);
        $s3Status = $uploadRes ? "Uploaded to S3" : "S3 Upload Failed";
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Backup completed',
        'filename' => $filename,
        's3_status' => $s3Status,
        'size' => filesize($filePath)
    ]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database dump failed']);
}

/**
 * Simplified S3 Upload using cURL and AWS Signature V4 (Mock/Placeholder for standalone PHP)
 * In a real-world scenario, using the AWS SDK is highly recommended.
 */
function uploadToS3($filePath, $filename, $bucket, $region, $keyId, $secret) {
    // For standalone PHP without SDK, we recommend installing the AWS SDK or using a light wrapper.
    // This is a placeholder indicating where the S3 logic resides.
    return false; // Requires library or complex signature logic
}

/**
 * Pure PHP Backup Fallback
 */
function phpBackupFallback($conn, $filePath) {
    $tables = [];
    $result = $conn->query("SHOW TABLES");
    while ($row = $result->fetch_row()) { $tables[] = $row[0]; }

    $sql = "-- Adrinix Database Backup\n";
    $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";

    foreach ($tables as $table) {
        $result = $conn->query("SHOW CREATE TABLE `$table` ");
        $row = $result->fetch_row();
        $sql .= "\n\n" . $row[1] . ";\n\n";

        $result = $conn->query("SELECT * FROM `$table` ");
        $numFields = $result->field_count;

        for ($i = 0; $i < $numFields; $i++) {
            while ($row = $result->fetch_row()) {
                $sql .= "INSERT INTO `$table` VALUES(";
                for ($j = 0; $j < $numFields; $j++) {
                    $row[$j] = addslashes($row[$j]);
                    $row[$j] = str_replace("\n", "\\n", $row[$j]);
                    if (isset($row[$j])) { $sql .= '"' . $row[$j] . '"'; } else { $sql .= 'NULL'; }
                    if ($j < ($numFields - 1)) { $sql .= ','; }
                }
                $sql .= ");\n";
            }
        }
        $sql .= "\n\n\n";
    }

    return file_put_contents($filePath, $sql) !== false;
}
?>
