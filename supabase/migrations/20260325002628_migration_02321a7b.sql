-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. members
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_url TEXT,
  birthday TEXT NOT NULL,
  bowling_technique TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT,
  full_name TEXT NOT NULL,
  handicap INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  phone TEXT NOT NULL,
  sex TEXT NOT NULL,
  tac_code TEXT,
  tac_expiry TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,
  username TEXT NOT NULL UNIQUE
);

-- 2. games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_date TEXT NOT NULL,
  game_format TEXT,
  game_name TEXT NOT NULL,
  game_type TEXT,
  is_official BOOLEAN DEFAULT true,
  location TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  year INTEGER NOT NULL
);

-- 3. club_settings
CREATE TABLE IF NOT EXISTS club_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. fivefive_prizes
CREATE TABLE IF NOT EXISTS fivefive_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_count INTEGER NOT NULL,
  prize_count INTEGER NOT NULL,
  prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. fivefive_games
CREATE TABLE IF NOT EXISTS fivefive_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_date TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. gallery_albums (depends on members)
CREATE TABLE IF NOT EXISTS gallery_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  description TEXT,
  name TEXT NOT NULL,
  position_order INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. lane_configurations
CREATE TABLE IF NOT EXISTS lane_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lane_sebenar TEXT NOT NULL,
  lane_undian TEXT NOT NULL,
  position_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. nav_layout_settings
CREATE TABLE IF NOT EXISTS nav_layout_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. notifications (depends on members)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  target_date TEXT,
  target_type TEXT NOT NULL,
  title TEXT NOT NULL
);

-- 10. page_access_control
CREATE TABLE IF NOT EXISTS page_access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_level TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_enabled BOOLEAN DEFAULT true,
  page_name TEXT NOT NULL,
  page_path TEXT NOT NULL UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT,
  full_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. blok_games (depends on members)
CREATE TABLE IF NOT EXISTS blok_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_date TEXT NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  score_1 INTEGER NOT NULL DEFAULT 0,
  score_2 INTEGER NOT NULL DEFAULT 0,
  score_3 INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  winner TEXT
);

-- 13. game_players (depends on games, members)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  average_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game1_score INTEGER,
  game2_score INTEGER,
  game3_score INTEGER,
  game4_score INTEGER,
  game5_score INTEGER,
  handicap INTEGER DEFAULT 0,
  is_fivefive BOOLEAN DEFAULT false,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  overall_score INTEGER,
  total_score INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id)
);

-- 14. fivefive_participants (depends on fivefive_games, members)
CREATE TABLE IF NOT EXISTS fivefive_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fivefive_game_id UUID NOT NULL REFERENCES fivefive_games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  game1_prize INTEGER,
  game1_score INTEGER,
  game2_prize INTEGER,
  game2_score INTEGER,
  game3_prize INTEGER,
  game3_score INTEGER,
  game4_prize INTEGER,
  game4_score INTEGER,
  game5_prize INTEGER,
  game5_score INTEGER,
  total_prize INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fivefive_game_id, member_id)
);

-- 15. chat_rooms (depends on members)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'direct',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. gallery_images (depends on gallery_albums, members)
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  image_url TEXT NOT NULL,
  position_order INTEGER DEFAULT 0,
  title TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE
);

-- 17. gallery_permissions (depends on members)
CREATE TABLE IF NOT EXISTS gallery_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  can_add_albums BOOLEAN DEFAULT false,
  can_add_images BOOLEAN DEFAULT false,
  can_delete_albums BOOLEAN DEFAULT false,
  can_delete_images BOOLEAN DEFAULT false,
  can_edit_albums BOOLEAN DEFAULT false,
  can_edit_images BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. lane_assignments (depends on games, members)
CREATE TABLE IF NOT EXISTS lane_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  lane_position TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id),
  UNIQUE(game_id, lane_position)
);

-- 19. lane_spin_results (depends on games, members)
CREATE TABLE IF NOT EXISTS lane_spin_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  lane_position TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  spun_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, member_id),
  UNIQUE(game_id, lane_position)
);

-- 20. member_feedback (depends on members)
CREATE TABLE IF NOT EXISTS member_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_reply TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID REFERENCES members(id) ON DELETE SET NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. member_sessions (depends on members)
CREATE TABLE IF NOT EXISTS member_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  user_agent TEXT
);

-- 22. mini_blok (depends on members)
CREATE TABLE IF NOT EXISTS mini_blok (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date TEXT NOT NULL,
  location TEXT,
  num_games INTEGER NOT NULL DEFAULT 5,
  owner_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. notification_recipients (depends on notifications, members)
CREATE TABLE IF NOT EXISTS notification_recipients (
  delivered_at TIMESTAMP WITH TIME ZONE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (notification_id, member_id)
);

-- 24. training_scores (depends on members)
CREATE TABLE IF NOT EXISTS training_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  frame1_roll1 TEXT, frame1_roll2 TEXT, frame1_split BOOLEAN,
  frame10_roll1 TEXT, frame10_roll2 TEXT, frame10_roll3 TEXT, frame10_split BOOLEAN,
  frame2_roll1 TEXT, frame2_roll2 TEXT, frame2_split BOOLEAN,
  frame3_roll1 TEXT, frame3_roll2 TEXT, frame3_split BOOLEAN,
  frame4_roll1 TEXT, frame4_roll2 TEXT, frame4_split BOOLEAN,
  frame5_roll1 TEXT, frame5_roll2 TEXT, frame5_split BOOLEAN,
  frame6_roll1 TEXT, frame6_roll2 TEXT, frame6_split BOOLEAN,
  frame7_roll1 TEXT, frame7_roll2 TEXT, frame7_split BOOLEAN,
  frame8_roll1 TEXT, frame8_roll2 TEXT, frame8_split BOOLEAN,
  frame9_roll1 TEXT, frame9_roll2 TEXT, frame9_split BOOLEAN,
  location TEXT,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  notes TEXT,
  total_score INTEGER,
  training_date TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. chat_participants (depends on chat_rooms, members)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID REFERENCES members(id) ON DELETE SET NULL,
  is_banned BOOLEAN DEFAULT false,
  is_silenced BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  silence_reason TEXT,
  silenced_at TIMESTAMP WITH TIME ZONE,
  silenced_by UUID REFERENCES members(id) ON DELETE SET NULL,
  UNIQUE(room_id, member_id)
);

-- 26. chat_messages (depends on chat_rooms, members)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES members(id) ON DELETE SET NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  message TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE
);

-- 27. mini_blok_collaborators (depends on mini_blok, members)
CREATE TABLE IF NOT EXISTS mini_blok_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  mini_blok_id UUID NOT NULL REFERENCES mini_blok(id) ON DELETE CASCADE,
  UNIQUE(mini_blok_id, member_id)
);

-- 28. mini_blok_players (depends on mini_blok)
CREATE TABLE IF NOT EXISTS mini_blok_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handicap INTEGER DEFAULT 0,
  mini_blok_id UUID NOT NULL REFERENCES mini_blok(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  scores JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mini_blok_id, player_name)
);

-- 29. mini_blok_shares (depends on mini_blok, members)
CREATE TABLE IF NOT EXISTS mini_blok_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  mini_blok_id UUID NOT NULL REFERENCES mini_blok(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  token TEXT NOT NULL UNIQUE
);

DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ALTER TABLE ' || table_name || ' ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Public access" ON ' || table_name || ';';
    EXECUTE 'CREATE POLICY "Public access" ON ' || table_name || ' FOR ALL USING (true) WITH CHECK (true);';
  END LOOP;
END $$;