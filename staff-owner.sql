-- Run the entire script in the Aether database in one SQL submission.
-- Create the account first. Replace YOUR_USERNAME with its username.
-- ROLLBACK clears a transaction left open by an earlier failed attempt.
ROLLBACK;
ALTER TABLE staff_roles MODIFY COLUMN role ENUM('Moderator','Admin','Owner') NOT NULL;
SET @aether_owner_username = 'YOUR_USERNAME';
START TRANSACTION;
INSERT INTO staff_roles (user_id, role)
SELECT id, 'Owner' FROM users
WHERE CONVERT(username USING utf8mb4) COLLATE utf8mb4_unicode_ci =
      CONVERT(@aether_owner_username USING utf8mb4) COLLATE utf8mb4_unicode_ci
ON DUPLICATE KEY UPDATE role = 'Owner';
INSERT INTO staff_audit (actor_id, action, target_id, details)
SELECT id, 'sql_assign_owner', id, 'Owner assigned through database administration'
FROM users
WHERE CONVERT(username USING utf8mb4) COLLATE utf8mb4_unicode_ci =
      CONVERT(@aether_owner_username USING utf8mb4) COLLATE utf8mb4_unicode_ci;
COMMIT;
-- Must return your account with role Owner. No row means username not found.
SELECT u.id, u.username, s.role FROM users u JOIN staff_roles s
ON CONVERT(s.user_id USING utf8mb4) COLLATE utf8mb4_unicode_ci =
   CONVERT(u.id USING utf8mb4) COLLATE utf8mb4_unicode_ci
WHERE CONVERT(u.username USING utf8mb4) COLLATE utf8mb4_unicode_ci =
      CONVERT(@aether_owner_username USING utf8mb4) COLLATE utf8mb4_unicode_ci;
