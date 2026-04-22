<?php
// scratch/migrate_tax_method.php
require_once __DIR__ . '/../api/db.php';

echo "Starting migration...\n";

$sqls = [
    "ALTER TABLE `products` ADD `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive' AFTER `tax_profile_id`",
    "ALTER TABLE `invoice_items` ADD `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive' AFTER `unit_price`"
];

foreach ($sqls as $sql) {
    try {
        if ($conn->query($sql) === TRUE) {
            echo "Successfully executed: $sql\n";
        } else {
            echo "Error executing $sql: " . $conn->error . "\n";
        }
    } catch (Exception $e) {
        echo "Exception for $sql: " . $e->getMessage() . "\n";
    }
}

echo "Migration finished.\n";
?>
