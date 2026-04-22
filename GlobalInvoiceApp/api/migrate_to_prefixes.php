<?php
/**
 * migrate_to_prefixes.php
 * 
 * One-time migration script to move data from shared tables 
 * into the new Table-per-Tenant (prefixed) tables.
 */
require_once 'db.php';

// Disable timeout for large migrations
set_time_limit(0);

echo "Starting Multi-Tenant Migration...\n";

// 1. Get all companies
$res = $conn->query("SELECT id, user_id FROM companies");
$companies = [];
while ($row = $res->fetch_assoc()) { $companies[] = $row; }

foreach ($companies as $comp) {
    $cid = $comp['id'];
    $uid = $comp['user_id'];
    $prefix = "c" . $cid . "_";
    
    echo "Processing Company ID: $cid (Prefix: $prefix)...\n";
    
    // Ensure tables exist
    ensureTenantSchema($conn, $cid);
    
    // Move Tax Profiles
    $conn->query("INSERT IGNORE INTO `{$prefix}tax_profiles` (id, user_id, name, percentage, description) 
                 SELECT id, user_id, label, rate_percentage, '' FROM tax_profiles WHERE company_id = $cid");
    
    // Move Clients
    $conn->query("INSERT IGNORE INTO `{$prefix}clients` (id, user_id, name, email, phone, billing_address) 
                 SELECT id, user_id, name, email, phone, billing_address FROM clients WHERE company_id = $cid");
    
    // Move Products
    $conn->query("INSERT IGNORE INTO `{$prefix}products` (id, user_id, name, description, base_price, category) 
                 SELECT id, user_id, name, description, unit_price, category FROM products WHERE company_id = $cid");
    
    // Move Invoices
    $conn->query("INSERT IGNORE INTO `{$prefix}invoices` (id, user_id, client_id, invoice_number, status, issue_date, due_date, subtotal, tax_total, grand_total, notes) 
                 SELECT id, user_id, client_id, invoice_number, status, issue_date, due_date, subtotal, tax_total, grand_total, notes 
                 FROM invoices WHERE company_id = $cid");
    
    // Move Invoice Items
    $conn->query("INSERT IGNORE INTO `{$prefix}invoice_items` (id, invoice_id, description, quantity, unit_price, tax_method, tax_profile_id) 
                 SELECT ii.id, ii.invoice_id, ii.description, ii.quantity, ii.unit_price, ii.tax_method, ii.tax_profile_id 
                 FROM invoice_items ii 
                 JOIN invoices i ON ii.invoice_id = i.id 
                 WHERE i.company_id = $cid");
                 
    // Move Team Members
    $conn->query("INSERT IGNORE INTO `{$prefix}team_members` (id, user_id, email, password_hash, name, role) 
                 SELECT id, user_id, email, password_hash, name, role FROM team_members WHERE user_id = $uid");

    echo "Done for Company $cid.\n";
}

echo "\nMigration Complete! You can now delete the old shared tables if you are confident.\n";
?>
