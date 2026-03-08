
-- Fair play flags table for tracking suspicious activity
CREATE TABLE public.fair_play_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL, -- 'reciprocal_voting', 'rapid_proofs', 'mass_boost', 'duplicate_proof', 'self_vote_attempt'
  severity text NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high'
  details jsonb DEFAULT '{}'::jsonb,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_fair_play_flags_user ON public.fair_play_flags (user_id, created_at DESC);
CREATE INDEX idx_fair_play_flags_unresolved ON public.fair_play_flags (is_resolved, created_at DESC);

ALTER TABLE public.fair_play_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage flags
CREATE POLICY "Admins can view all flags"
  ON public.fair_play_flags FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flags"
  ON public.fair_play_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert flags
CREATE POLICY "System can insert flags"
  ON public.fair_play_flags FOR INSERT
  WITH CHECK (true);

-- =============================================
-- Duplicate proof prevention (unique constraint)
-- Only one proof per participant per simple challenge (non-frequency/quantity)
-- For frequency: handled via app logic already
-- =============================================

-- Function: detect reciprocal voting patterns
CREATE OR REPLACE FUNCTION public.detect_reciprocal_voting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _proof_owner_id uuid;
  _reverse_count integer;
  _challenge_id uuid;
BEGIN
  -- Get proof owner
  SELECT pa.user_id, p.challenge_id INTO _proof_owner_id, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  WHERE p.id = NEW.proof_id;

  -- Skip if voting on own proof (shouldn't happen but safety)
  IF _proof_owner_id = NEW.voter_id THEN
    RETURN NEW;
  END IF;

  -- Count how many times the proof owner has voted for the voter's proofs
  -- in the same challenge within the last 7 days
  SELECT count(*) INTO _reverse_count
  FROM votes v
  JOIN proofs p ON p.id = v.proof_id
  JOIN participations pa ON pa.id = p.participation_id
  WHERE v.voter_id = _proof_owner_id
    AND pa.user_id = NEW.voter_id
    AND p.challenge_id = _challenge_id
    AND v.vote_type IN ('honor', 'validated')
    AND v.created_at > now() - interval '7 days';

  -- If reciprocal voting detected (3+ times), flag it
  IF _reverse_count >= 3 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      NEW.voter_id,
      'reciprocal_voting',
      CASE WHEN _reverse_count >= 5 THEN 'high' ELSE 'medium' END,
      _challenge_id,
      jsonb_build_object(
        'voter_id', NEW.voter_id,
        'proof_owner_id', _proof_owner_id,
        'reverse_vote_count', _reverse_count,
        'description', 'Reciprocal positive voting pattern detected'
      )
    );

    -- Notify admins
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'admin_alert', '⚠️ Fair Play Alert',
      'Reciprocal voting pattern detected in a challenge',
      jsonb_build_object('flag_type', 'reciprocal_voting', 'challenge_id', _challenge_id, 'user_id', NEW.voter_id)
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_reciprocal_voting
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_reciprocal_voting();

-- Function: detect mass boosting
CREATE OR REPLACE FUNCTION public.detect_mass_boosting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _boost_count_24h integer;
BEGIN
  -- Count boosts by this user in the last 24 hours
  SELECT count(*) INTO _boost_count_24h
  FROM boosts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  -- Flag if more than 5 boosts in 24 hours (suspicious)
  IF _boost_count_24h >= 5 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      NEW.user_id,
      'mass_boost',
      CASE WHEN _boost_count_24h >= 8 THEN 'high' ELSE 'medium' END,
      NEW.target_challenge_id,
      jsonb_build_object(
        'boost_count_24h', _boost_count_24h,
        'boost_type', NEW.boost_type,
        'description', 'Excessive boosting detected within 24 hours'
      )
    );

    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'admin_alert', '⚠️ Mass Boost Alert',
      'A user used ' || _boost_count_24h || ' boosters in 24 hours',
      jsonb_build_object('flag_type', 'mass_boost', 'user_id', NEW.user_id)
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_mass_boosting
  AFTER INSERT ON public.boosts
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_mass_boosting();

-- Function: detect rapid/duplicate proof submissions
CREATE OR REPLACE FUNCTION public.detect_rapid_proofs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent_count integer;
  _owner_id uuid;
BEGIN
  SELECT pa.user_id INTO _owner_id
  FROM participations pa WHERE pa.id = NEW.participation_id;

  -- Count proofs submitted by this user in this challenge in last 5 minutes
  SELECT count(*) INTO _recent_count
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  WHERE pa.user_id = _owner_id
    AND p.challenge_id = NEW.challenge_id
    AND p.created_at > now() - interval '5 minutes'
    AND p.id != NEW.id;

  IF _recent_count >= 3 THEN
    INSERT INTO fair_play_flags (user_id, flag_type, severity, challenge_id, details)
    VALUES (
      _owner_id,
      'rapid_proofs',
      'medium',
      NEW.challenge_id,
      jsonb_build_object(
        'proofs_in_5min', _recent_count + 1,
        'description', 'Rapid proof submissions detected'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_rapid_proofs
  AFTER INSERT ON public.proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_rapid_proofs();
