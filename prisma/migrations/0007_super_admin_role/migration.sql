-- Upgrade existing ADMIN users whose email matches ADMIN_EMAIL to SUPER_ADMIN.
-- This is a data-only migration; the role column is already a free-text String.
-- Run manually if ADMIN_EMAIL differs from the originally registered admin:
--   UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "email" = 'your-email@example.com';

-- Note: The role column stores plain strings (USER, ADMIN, SUPER_ADMIN).
-- No schema change needed — this migration exists to document the role tier addition.
