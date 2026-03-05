-- Drop the UNIQUE constraint on email column
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;