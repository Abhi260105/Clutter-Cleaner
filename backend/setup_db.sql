-- Run once as a MySQL admin user. Tables are created automatically by the app
-- on startup; this script only creates the database and a dedicated user.
CREATE DATABASE IF NOT EXISTS smart_clutter_cleaner;

CREATE USER IF NOT EXISTS 'clutter_user'@'localhost'
IDENTIFIED BY 'Abhishe2005';

ALTER USER 'clutter_user'@'localhost'
IDENTIFIED BY 'Abhishek2005';

GRANT ALL PRIVILEGES ON smart_clutter_cleaner.*
TO 'clutter_user'@'localhost';

FLUSH PRIVILEGES;