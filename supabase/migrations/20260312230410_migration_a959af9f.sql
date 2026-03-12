-- Gallery Albums Table
CREATE TABLE gallery_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  position_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE gallery_albums IS 'Photo gallery albums/folders';
COMMENT ON COLUMN gallery_albums.position_order IS 'Display order for albums';

-- Gallery Images Table
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  position_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE gallery_images IS 'Images within gallery albums';
COMMENT ON COLUMN gallery_images.position_order IS 'Display order within album';

-- Gallery Permissions Table (for delegated access)
CREATE TABLE gallery_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  can_add_albums BOOLEAN DEFAULT false,
  can_edit_albums BOOLEAN DEFAULT false,
  can_delete_albums BOOLEAN DEFAULT false,
  can_add_images BOOLEAN DEFAULT false,
  can_edit_images BOOLEAN DEFAULT false,
  can_delete_images BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

COMMENT ON TABLE gallery_permissions IS 'Gallery management permissions delegated by admin to specific members';

-- Indexes for performance
CREATE INDEX idx_gallery_albums_order ON gallery_albums(position_order);
CREATE INDEX idx_gallery_albums_created_by ON gallery_albums(created_by);
CREATE INDEX idx_gallery_images_album ON gallery_images(album_id);
CREATE INDEX idx_gallery_images_order ON gallery_images(album_id, position_order);
CREATE INDEX idx_gallery_images_uploaded_by ON gallery_images(uploaded_by);
CREATE INDEX idx_gallery_permissions_member ON gallery_permissions(member_id);

-- Enable RLS
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gallery_albums
CREATE POLICY "Anyone can view albums"
  ON gallery_albums FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and permitted members can manage albums"
  ON gallery_albums FOR ALL
  TO authenticated
  USING (
    is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM members m
      LEFT JOIN gallery_permissions gp ON gp.member_id = m.id
      WHERE m.user_id = auth.uid()
      AND (gp.can_add_albums = true OR gp.can_edit_albums = true OR gp.can_delete_albums = true)
    )
  )
  WITH CHECK (
    is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM members m
      LEFT JOIN gallery_permissions gp ON gp.member_id = m.id
      WHERE m.user_id = auth.uid()
      AND (gp.can_add_albums = true OR gp.can_edit_albums = true OR gp.can_delete_albums = true)
    )
  );

-- RLS Policies for gallery_images
CREATE POLICY "Anyone can view images"
  ON gallery_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin and permitted members can manage images"
  ON gallery_images FOR ALL
  TO authenticated
  USING (
    is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM members m
      LEFT JOIN gallery_permissions gp ON gp.member_id = m.id
      WHERE m.user_id = auth.uid()
      AND (gp.can_add_images = true OR gp.can_edit_images = true OR gp.can_delete_images = true)
    )
  )
  WITH CHECK (
    is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM members m
      LEFT JOIN gallery_permissions gp ON gp.member_id = m.id
      WHERE m.user_id = auth.uid()
      AND (gp.can_add_images = true OR gp.can_edit_images = true OR gp.can_delete_images = true)
    )
  );

-- RLS Policies for gallery_permissions
CREATE POLICY "Anyone can view permissions"
  ON gallery_permissions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage permissions"
  ON gallery_permissions FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_gallery_albums_updated_at BEFORE UPDATE ON gallery_albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_images_updated_at BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_permissions_updated_at BEFORE UPDATE ON gallery_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();