-- Create storage policies for logos bucket
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IN (
    SELECT id FROM members WHERE is_admin = true
  )
);

CREATE POLICY "Admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND auth.uid() IN (
    SELECT id FROM members WHERE is_admin = true
  )
);

CREATE POLICY "Admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND auth.uid() IN (
    SELECT id FROM members WHERE is_admin = true
  )
);