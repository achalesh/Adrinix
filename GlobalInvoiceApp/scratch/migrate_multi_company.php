<?php
// scratch/migrate_multi_company.php
require_once __DIR__ . '/../api/db.php';

echo "🚀 Starting Multi-Company Migration...\n";

// 1. Create Companies Table
$createTable = "CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `phone` VARCHAR(50),
  `email` VARCHAR(255),
  `logo` MEDIUMTEXT,
  `country` VARCHAR(50) DEFAULT 'United States',
  `registration_number` VARCHAR(100),
  `currency_code` VARCHAR(10) DEFAULT 'USD',
  `locale` VARCHAR(10) DEFAULT 'en-US',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
)";

if ($conn->query($createTable) === TRUE) {
    echo "✅ Companies table created.\n";
} else {
    die("❌ Error creating table: " . $conn->error);
}

// 2. Add company_id to other tables
$tables = ['tax_profiles', 'clients', 'products', 'invoices'];
foreach ($tables as $t) {
    echo "🔍 Checking table: $t...\n";
    $checkCol = $conn->query("SHOW COLUMNS FROM `$t` LIKE 'company_id'");
    if ($checkCol->num_rows == 0) {
        $alter = "ALTER TABLE `$t` ADD COLUMN `company_id` INT AFTER `user_id`";
        if ($conn->query($alter)) {
            echo "✅ Column 'company_id' added to $t.\n";
        }
    } else {
        echo "ℹ️ Column 'company_id' already exists in $t.\n";
    }
}

// 3. Migrate Data
echo "📦 Migrating existing company data from users to companies...\n";
$users = $conn->query("SELECT id, company_name, company_address, contact_number, contact_email, company_logo, country, registration_number, currency_code, locale FROM users");

while ($u = $users->fetch_assoc()) {
    $uid = $u['id'];
    // Check if we already migrated this user
    $checkComp = $conn->prepare("SELECT id FROM companies WHERE user_id = ? LIMIT 1");
    $checkComp->bind_param("i", $uid);
    $checkComp->execute();
    $existing = $checkComp->get_result()->fetch_assoc();
    
    if (!$existing) {
        $ist = $conn->prepare("INSERT INTO companies (user_id, name, address, phone, email, logo, country, registration_number, currency_code, locale) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $ist->bind_param("isssssssss", 
            $uid, $u['company_name'], $u['company_address'], $u['contact_number'], $u['contact_email'], 
            $u['company_logo'], $u['country'], $u['registration_number'], $u['currency_code'], $u['locale']);
        if ($ist->execute()) {
            $cid = $conn->insert_id;
            echo "🏢 Created company #$cid for user #$uid.\n";
            
            // Update all records for this user to this new company
            foreach ($tables as $t) {
                $conn->query("UPDATE `$t` SET company_id = $cid WHERE user_id = $uid");
                echo "   🔗 Linked $t records to company #$cid.\n";
            }
        }
    } else {
        echo "⏭️ User #$uid already has a company record. Skipping data migration.\n";
    }
}

// 4. Update Foreign Keys (Optional but recommended)
foreach ($tables as $t) {
   // Add foreign key if not exists (harder to check, so we do it safely)
   // For now, index is enough
   $conn->query("CREATE INDEX `idx_company_id` ON `$t`(`company_id`)");
}

echo "\n✨ Multi-Company Migration Finished Successfully!\n";
?>
