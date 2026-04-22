<?php
require_once 'api/db.php';
$res = $conn->query("SHOW TABLES");
$tables = [];
while($row = $res->fetch_row()) $tables[] = $row[0];
echo "Current tables in " . $db_name . ": " . implode(', ', $tables) . "\n";

foreach(['users', 'clients', 'products', 'invoices', 'tax_profiles', 'companies'] as $t) {
    if(in_array($t, $tables)) {
        echo "✅ Table '$t' exists.\n";
        $colRes = $conn->query("SHOW COLUMNS FROM `$t` LIKE 'company_id'");
        if ($colRes && $colRes->num_rows > 0) {
            echo "   🔹 '$t' has 'company_id'.\n";
        } else if($t !== 'companies' && $t !== 'users') {
             echo "   ❌ '$t' is MISSING 'company_id'.\n";
        }
    } else {
        echo "⚠️ Table '$t' is MISSING.\n";
    }
}
?>
