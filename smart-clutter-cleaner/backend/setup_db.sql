-- Run once as a MySQL admin user. Tables are created automatically by the app
-- on startup; this script only creates the database and a dedicated user.
CREATE DATABASE IF NOT EXISTS clutter_cleaner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'clutter_user'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON clutter_cleaner.* TO 'clutter_user'@'localhost';
FLUSH PRIVILEGES;
