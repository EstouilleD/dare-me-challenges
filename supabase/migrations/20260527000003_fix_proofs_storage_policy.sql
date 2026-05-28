-- Broaden the proofs storage INSERT policy to allow any path whose
-- first folder component matches the authenticated user's ID.
-- This covers: userId/timestamp.ext  AND  userId/demo_timestamp.ext
-- Replaces the previous policy of the same name.
DROP POLICY IF EXISTS "Users can upload proof files" ON storage.objects;
CREATE POLICY "Users can upload proof files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proofs'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
