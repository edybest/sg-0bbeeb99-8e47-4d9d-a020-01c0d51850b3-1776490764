-- Create push_subscriptions table to store Web Push subscription data
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_member ON push_subscriptions(member_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members WHERE user_id = auth.uid() AND is_admin = true
    )
  );

COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for members';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'P256DH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for push';