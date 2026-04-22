-- Adrinix Global Invoice App - Master Database Schema
-- Version 2.0 (Multi-Company Support)

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- Each user is an owner who can manage multiple companies.
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMPANIES ────────────────────────────────────────────────────────────────
-- A user can have multiple companies (Businesses).
CREATE TABLE `companies` (
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

-- ─── TAX PROFILES ─────────────────────────────────────────────────────────────
-- Tax rules (VAT, GST, etc.) are specific to a company.
CREATE TABLE `tax_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `label` VARCHAR(50) NOT NULL,
  `rate_percentage` DECIMAL(5,2) NOT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- ─── CLIENTS ──────────────────────────────────────────────────────────────────
-- Contacts are organized by company.
CREATE TABLE `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `tax_id` VARCHAR(100),
  `billing_address` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- ─── PRODUCTS & SERVICES ──────────────────────────────────────────────────────
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(50) DEFAULT 'item',
  `category` VARCHAR(100),
  `tax_profile_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tax_profile_id`) REFERENCES `tax_profiles`(`id`) ON DELETE SET NULL
);

-- ─── INVOICES ─────────────────────────────────────────────────────────────────
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL,
  `status` ENUM('Draft', 'Sent', 'Paid', 'Overdue') DEFAULT 'Draft',
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
);

-- ─── INVOICE ITEMS ────────────────────────────────────────────────────────────
CREATE TABLE `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_method` ENUM('exclusive', 'inclusive') DEFAULT 'exclusive',
  `tax_profile_id` INT,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tax_profile_id`) REFERENCES `tax_profiles`(`id`) ON DELETE SET NULL
);

-- ─── TEAM MEMBERS & AUTH ──────────────────────────────────────────────────────
CREATE TABLE `team_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'Editor', 'Viewer') DEFAULT 'Viewer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `password_resets` (
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
