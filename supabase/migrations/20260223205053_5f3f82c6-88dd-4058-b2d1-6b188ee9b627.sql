
-- In-app notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Trigger: notify when someone completes a challenge (is_done = true)
CREATE OR REPLACE FUNCTION public.notify_challenge_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _display_name text;
  _challenge_title text;
  _challenge_id uuid;
  _participant record;
BEGIN
  IF NEW.is_done = true AND (OLD.is_done IS NULL OR OLD.is_done = false) THEN
    SELECT display_name INTO _display_name FROM profiles WHERE id = NEW.user_id;
    SELECT title, id INTO _challenge_title, _challenge_id FROM challenges WHERE id = NEW.challenge_id;
    
    -- Notify all other participants in the challenge
    FOR _participant IN
      SELECT user_id FROM participations WHERE challenge_id = NEW.challenge_id AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        _participant.user_id,
        'challenge_completed',
        '🏁 Challenge completed!',
        _display_name || ' has completed the challenge "' || _challenge_title || '"',
        jsonb_build_object('challenge_id', _challenge_id, 'completer_id', NEW.user_id)
      );
    END LOOP;
    
    -- Also notify the challenge owner
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT c.owner_id, 'challenge_completed', '🏁 Challenge completed!',
      _display_name || ' has completed your challenge "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'completer_id', NEW.user_id)
    FROM challenges c WHERE c.id = NEW.challenge_id AND c.owner_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_challenge_completed
AFTER UPDATE ON public.participations
FOR EACH ROW
EXECUTE FUNCTION public.notify_challenge_completed();

-- Trigger: notify when someone votes on your proof
CREATE OR REPLACE FUNCTION public.notify_proof_voted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voter_name text;
  _proof_owner_id uuid;
  _challenge_title text;
  _challenge_id uuid;
  _vote_label text;
BEGIN
  SELECT display_name INTO _voter_name FROM profiles WHERE id = NEW.voter_id;
  
  SELECT pa.user_id, c.title, c.id INTO _proof_owner_id, _challenge_title, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.id = NEW.proof_id;
  
  IF _proof_owner_id IS NOT NULL AND _proof_owner_id != NEW.voter_id THEN
    _vote_label := CASE 
      WHEN NEW.vote_type = 'honor' THEN 'validated with honors'
      WHEN NEW.vote_type = 'approve' THEN 'validated'
      ELSE 'voted on'
    END;
    
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _proof_owner_id,
      'proof_voted',
      '⚖️ New vote on your proof!',
      _voter_name || ' ' || _vote_label || ' your proof in "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'proof_id', NEW.proof_id, 'voter_id', NEW.voter_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proof_voted
AFTER INSERT ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.notify_proof_voted();

-- Trigger: notify when you reach the top of a challenge ranking
CREATE OR REPLACE FUNCTION public.notify_top_ranking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_score integer;
  _challenge_title text;
BEGIN
  IF NEW.score IS NOT NULL AND NEW.score > 0 THEN
    SELECT max(score) INTO _max_score FROM participations 
    WHERE challenge_id = NEW.challenge_id AND user_id != NEW.user_id;
    
    IF _max_score IS NULL OR NEW.score > _max_score THEN
      -- Check if we already notified for this challenge recently (avoid spam)
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = NEW.user_id 
        AND type = 'top_ranking' 
        AND (data->>'challenge_id')::uuid = NEW.challenge_id
        AND created_at > now() - interval '1 hour'
      ) THEN
        SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.challenge_id;
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'top_ranking',
          '🏆 You''re on top!',
          'You''ve reached the top of the ranking in "' || _challenge_title || '"!',
          jsonb_build_object('challenge_id', NEW.challenge_id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_score_updated
AFTER UPDATE OF score ON public.participations
FOR EACH ROW
EXECUTE FUNCTION public.notify_top_ranking();
