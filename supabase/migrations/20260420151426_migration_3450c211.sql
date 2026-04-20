-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS after_member_insert_lobby ON members;
DROP FUNCTION IF EXISTS auto_join_lobby();