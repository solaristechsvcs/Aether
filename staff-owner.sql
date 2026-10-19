-- Run in the Aether database using phpMyAdmin or your MySQL SQL editor.
-- Create the account normally first. Replace YOUR_USERNAME below.
-- Supports installations with the previous two-role schema.
ALTER TABLE staff_roles MODIFY COLUMN role ENUM('Moderator','Admin','Owner') NOT NULL;
SET @aether_owner_username = 'YOUR_USERNAME';
START TRANSACTION;
INSERT INTO staff_roles (user_id, role)
SELECT id, 'Owner' FROM users WHERE username = @aether_owner_username
ON DUPLICATE KEY UPDATE role = 'Owner';
INSERT INTO staff_audit (actor_id, action, target_id, details)
SELECT id, 'sql_assign_owner', id, 'Owner assigned through database administration'
FROM users WHERE username = @aether_owner_username;
COMMIT;
-- Must return the intended account with role Owner. No row means username not found.
SELECT u.id, u.username, s.role FROM users u JOIN staff_roles s ON s.user_id=u.id
WHERE u.username = @aether_owner_username;
