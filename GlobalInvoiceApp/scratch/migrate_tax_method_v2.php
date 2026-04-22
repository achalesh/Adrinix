<?php
// scratch/migrate_tax_method_v2.php
require_once __DIR__ . '/../api/db.php';

echo "Starting migration v2...\n";

$sqls = [
    "CREATE TABLE IF NOT EXISTS `products` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `name` VARCHAR(255) NOT NULL,
      `description` TEXT,
      `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      `unit` VARCHAR(50) DEFAULT 'item',
      `category` VARCHAR(100),
      `tax_profile_id` INT DEFAULT NULL,
      `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive',
      `is_active` TINYINT(1) DEFAULT 1,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
      FOREIGN KEY (`tax_profile_id`) REFERENCES `tax_profiles`(`id`) ON DELETE SET NULL
    )",
    "ALTER TABLE `invoice_items` ADD COLUMN IF NOT EXISTS `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive' AFTER `unit_price`"
];

// Note: MySQL doesn't support 'ADD COLUMN IF NOT EXISTS' natively for ALTER. 
// I'll check existence manually for the ALTER.

foreach ($sqls as $sql) {
    if (strpos($sql, 'ALTER TABLE `invoice_items`') !== false) {
        $check = $conn->query("SHOW COLUMNS FROM `invoice_items` LIKE 'tax_method'");
        if ($check->num_rows > 0) {
            echo "Skipping ALTER for invoice_items: column already exists.\n";
            continue;
        }
    }
    
    try {
        if ($conn->query($sql) === TRUE) {
            echo "Successfully executed: " . substr($sql, 0, 50) . "...\n";
        } else {
            echo "Error executing current SQL: " . $conn->error . "\n";
        }
    } catch (Exception $e) {
        echo "Exception: " . $e->getMessage() . "\n";
    }
}

echo "Migration v2 finished.\n";
?>
