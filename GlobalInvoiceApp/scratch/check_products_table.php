<?php
// scratch/check_products_table.php
require_once __DIR__ . '/../api/db.php';
$res = $conn->query("DESCRIBE products");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        print_r($row);
    }
} else {
    echo "Error: " . $conn->error;
}
?>
