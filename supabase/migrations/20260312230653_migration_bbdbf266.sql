-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery bucket
CREATE POLICY "Public can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins and delegated can delete gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery'
  AND (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid()::uuid 
      AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM gallery_permissions 
      WHERE member_id = auth.uid()::uuid
    )
  )
);