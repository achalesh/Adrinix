<?php
// scratch/check_tables.php
require_once __DIR__ . '/../api/db.php';
$result = $conn->query("SHOW TABLES");
while ($row = $result->fetch_array()) {
    echo $row[0] . "\n";
}
?>
