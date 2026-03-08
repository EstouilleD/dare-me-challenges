
-- Add category column to communities
ALTER TABLE public.communities ADD COLUMN category text NOT NULL DEFAULT 'general';

-- Add community_rules column
ALTER TABLE public.communities ADD COLUMN rules text;

-- Add requires_approval for join requests
ALTER TABLE public.communities ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Create index on category
CREATE INDEX idx_communities_category ON public.communities(category);

-- Create communities storage bucket for logos and banners
INSERT INTO storage.buckets (id, name, public) VALUES ('communities', 'communities', true);

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view community assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'communities');

-- Storage RLS: authenticated can upload
CREATE POLICY "Authenticated users can upload community assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'communities');

-- Storage RLS: owner can update/delete own uploads
CREATE POLICY "Users can update own community assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own community assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'communities' AND (storage.foldername(name))[1] = auth.uid()::text);
