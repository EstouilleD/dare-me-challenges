-- Add INSERT policy for proofs storage bucket.
-- Allows authenticated users to upload files under their own user-ID folder.
-- Covers both regular proofs (userId/timestamp.ext) and demos (userId/demos/timestamp.ext).
DROP POLICY IF EXISTS "Users can upload proof files" ON storage.objects;
CREATE POLICY "Users can upload proof files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
