-- Zona Zero — tablas en BD compartida Hostalia / local intocables_db
-- Prefijo: zona_zero_

CREATE TABLE IF NOT EXISTS `zona_zero_saves` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `slot` TINYINT UNSIGNED NOT NULL,
  `save_version` INT NOT NULL DEFAULT 1,
  `title` VARCHAR(120) DEFAULT NULL,
  `summary` VARCHAR(255) DEFAULT NULL,
  `day_num` INT NOT NULL DEFAULT 1,
  `population` INT NOT NULL DEFAULT 0,
  `is_alive` TINYINT(1) NOT NULL DEFAULT 1,
  `payload` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_zona_zero_user_slot` (`user_id`, `slot`),
  KEY `idx_zona_zero_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
