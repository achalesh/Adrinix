<?php
require_once 'api/db.php';
$stmt = $conn->prepare("SELECT * FROM c1_products");
$stmt->execute();
$res = $stmt->get_result();
while($row = $res->fetch_assoc()) {
    print_r($row);
}
