-- Fix RLS policies for notification_recipients
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notification_recipients;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Allow insert for notification system" ON notification_recipients;

-- NEW POLICIES:
-- 1. Allow system/backend to INSERT notification recipients (no user restriction)
CREATE POLICY "system_can_insert_recipients" 
ON notification_recipients 
FOR INSERT 
WITH CHECK (true);

-- 2. Members can SELECT their own notification recipients
CREATE POLICY "members_select_own" 
ON notification_recipients 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM members WHERE id = auth.uid()
  )
);

-- 3. Members can UPDATE their own notification recipients (mark as read)
CREATE POLICY "members_update_own" 
ON notification_recipients 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM members WHERE id = auth.uid()
  )
);

-- 4. Members can DELETE their own notification recipients
CREATE POLICY "members_delete_own" 
ON notification_recipients 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM members WHERE id = auth.uid()
  )
);