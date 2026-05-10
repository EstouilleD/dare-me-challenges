
-- Create deleted_users archive table
CREATE TABLE public.deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  full_name text,
  account_status text NOT NULL DEFAULT 'deleted',
  deleted_by uuid,
  deletion_reason text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz
);

ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view deleted users
CREATE POLICY "Admins can view deleted users"
ON public.deleted_users FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert deleted users"
ON public.deleted_users FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow the edge function (service role) to insert as well - handled via service role key
