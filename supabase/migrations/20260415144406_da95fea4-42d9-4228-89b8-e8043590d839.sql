
-- Revert buckets to public - needed for getPublicUrl() to work
UPDATE storage.buckets SET public = true WHERE id IN ('avatars', 'proofs', 'communities');
