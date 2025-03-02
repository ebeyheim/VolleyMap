CREATE DATABASE volleyball_plays;
USE volleyball_plays;

CREATE TABLE plays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

ALTER TABLE plays ADD COLUMN category_id INT DEFAULT NULL;

-- Add a foreign key constraint to link categories
ALTER TABLE plays ADD CONSTRAINT fk_category
FOREIGN KEY (category_id) REFERENCES categories(id)
ON DELETE SET NULL;