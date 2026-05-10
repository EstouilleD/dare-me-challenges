
-- Add details column to reports
ALTER TABLE public.reports ADD COLUMN details text;

-- Add unique constraint to prevent duplicate reports per user per challenge
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_challenge_unique UNIQUE (reporter_id, challenge_id);

-- Create trigger to set challenge status to 'under_review' when reported
CREATE OR REPLACE FUNCTION public.handle_challenge_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.challenges
  SET status = 'under_review'
  WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_reported
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_challenge_report();
