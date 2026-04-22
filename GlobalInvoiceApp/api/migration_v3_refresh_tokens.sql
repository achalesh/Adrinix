-- Adrinix Database Migration V3
-- Adds support for Refresh Tokens to enable silent session refresh.

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `member_id` INT DEFAULT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`member_id`) REFERENCES `team_members`(`id`) ON DELETE CASCADE
);

-- Indexing for speed
CREATE INDEX idx_refresh_token ON refresh_tokens(token);
