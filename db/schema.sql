-- OPTIONAL: the app creates all of this automatically on first start.
-- Run this by hand only if you prefer to set up the database yourself.
-- Requires MySQL 8.0+ (or MariaDB 10.5+).

CREATE TABLE IF NOT EXISTS memories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  story TEXT NULL,
  happened_on DATE NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memory_photos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  memory_id CHAR(36) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  caption VARCHAR(1000) NULL,
  alt_text VARCHAR(1000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_memory_photos_path (storage_path),
  KEY idx_memory_photos_memory (memory_id, sort_order),
  CONSTRAINT fk_memory_photos_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surprise_settings (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL DEFAULT '',
  subtitle VARCHAR(1000) NOT NULL DEFAULT '',
  button_text VARCHAR(200) NOT NULL DEFAULT 'Continue',
  items JSON NOT NULL,
  options JSON NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  KEY idx_stages_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded photos and music are stored here (BLOB), keyed by bucket + path.
CREATE TABLE IF NOT EXISTS files (
  bucket VARCHAR(40) NOT NULL,
  path VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bucket, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default welcome text. The default slides are seeded by the app when `stages` is empty.
INSERT IGNORE INTO surprise_settings (`key`, `value`) VALUES
  ('friend_nickname', 'Bestie'),
  ('welcome_title', 'A little place for our memories'),
  ('welcome_message', 'For the laughs, the chaos, and all the little moments that became special.'),
  ('final_letter', 'Life is a little brighter with a friend like you in it. Thanks for being your wonderfully weird self. Best friends, always. 💗');
