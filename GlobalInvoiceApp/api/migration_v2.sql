-- Adrinix Database Migration V2
-- Modernizes the schema to support multiple companies per user.

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS `companies` (
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
);

-- 2. Migrate existing company data from users to companies table
-- This ensures existing users don't lose their settings.
-- If the migration has already run partially, we skip this step or use INSERT IGNORE logic if IDs were preserved.
INSERT INTO `companies` (user_id, name, address, phone, email, logo, country, registration_number, currency_code, locale)
SELECT id, 
       IFNULL(company_name, 'My Business'), 
       company_address, 
       contact_number, 
       contact_email, 
       company_logo, 
       country, 
       registration_number, 
       currency_code, 
       locale
FROM `users`
WHERE id NOT IN (SELECT user_id FROM companies);

-- 3. Add company_id columns to related tables
ALTER TABLE `tax_profiles` ADD COLUMN `company_id` INT AFTER `user_id`;
ALTER TABLE `clients` ADD COLUMN `company_id` INT AFTER `user_id`;
ALTER TABLE `invoices` ADD COLUMN `company_id` INT AFTER `user_id`;
ALTER TABLE `products` ADD COLUMN `company_id` INT AFTER `user_id`;

-- 4. Map existing records to the new company IDs
-- We assume each existing user currently has only ONE company (the one we just created).
UPDATE `tax_profiles` t JOIN `companies` c ON t.user_id = c.user_id SET t.company_id = c.id;
UPDATE `clients`      t JOIN `companies` c ON t.user_id = c.user_id SET t.company_id = c.id;
UPDATE `invoices`     t JOIN `companies` c ON t.user_id = c.user_id SET t.company_id = c.id;
UPDATE `products`     t JOIN `companies` c ON t.user_id = c.user_id SET t.company_id = c.id;

-- 5. Set NOT NULL constraints and Foreign Keys
ALTER TABLE `tax_profiles` MODIFY `company_id` INT NOT NULL;
ALTER TABLE `clients`      MODIFY `company_id` INT NOT NULL;
ALTER TABLE `invoices`     MODIFY `company_id` INT NOT NULL;
ALTER TABLE `products`     MODIFY `company_id` INT NOT NULL;

ALTER TABLE `tax_profiles` ADD FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;
ALTER TABLE `clients`      ADD FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;
ALTER TABLE `invoices`     ADD FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;
ALTER TABLE `products`     ADD FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;

-- 6. Cleanup Users Table (Optional - uncomment if you want to remove old columns)
-- ALTER TABLE `users` DROP COLUMN `company_name`, DROP COLUMN `company_address`, DROP COLUMN `contact_number`, DROP COLUMN `contact_email`, DROP COLUMN `company_logo`, DROP COLUMN `country`, DROP COLUMN `registration_number`, DROP COLUMN `currency_code`, DROP COLUMN `locale`;
