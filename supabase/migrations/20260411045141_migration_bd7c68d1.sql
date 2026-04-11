CREATE POLICY "Members can delete own notifications"
ON notification_recipients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = notification_recipients.member_id
    AND m.user_id = (SELECT auth.uid() AS uid)
  )
);