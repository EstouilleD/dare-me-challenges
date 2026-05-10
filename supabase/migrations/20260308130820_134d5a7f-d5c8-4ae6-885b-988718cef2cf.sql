
-- 1. Trigger: notify when someone uses a boost in a challenge
CREATE OR REPLACE FUNCTION public.notify_boost_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booster_name text;
  _challenge_title text;
  _participant record;
BEGIN
  IF NEW.target_challenge_id IS NOT NULL THEN
    SELECT display_name INTO _booster_name FROM profiles WHERE id = NEW.user_id;
    SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.target_challenge_id;

    -- Notify all other participants in the challenge
    FOR _participant IN
      SELECT user_id FROM participations WHERE challenge_id = NEW.target_challenge_id AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        _participant.user_id,
        'boost_used',
        '🚀 Boost activated!',
        _booster_name || ' used a boost in "' || _challenge_title || '"',
        jsonb_build_object('challenge_id', NEW.target_challenge_id, 'booster_id', NEW.user_id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_boost_created
  AFTER INSERT ON public.boosts
  FOR EACH ROW EXECUTE FUNCTION public.notify_boost_used();

-- 2. Update vote trigger to send distinct notification for honor votes
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
  _notif_type text;
  _notif_title text;
BEGIN
  SELECT display_name INTO _voter_name FROM profiles WHERE id = NEW.voter_id;
  
  SELECT pa.user_id, c.title, c.id INTO _proof_owner_id, _challenge_title, _challenge_id
  FROM proofs p
  JOIN participations pa ON pa.id = p.participation_id
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.id = NEW.proof_id;
  
  IF _proof_owner_id IS NOT NULL AND _proof_owner_id != NEW.voter_id THEN
    IF NEW.vote_type = 'honor' THEN
      _notif_type := 'honor_vote_received';
      _notif_title := '🏅 Honor vote received!';
      _vote_label := 'gave you an honor vote';
    ELSIF NEW.vote_type = 'approve' THEN
      _notif_type := 'proof_voted';
      _notif_title := '⚖️ New vote on your proof!';
      _vote_label := 'validated';
    ELSE
      _notif_type := 'proof_voted';
      _notif_title := '⚖️ New vote on your proof!';
      _vote_label := 'voted on';
    END IF;
    
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _proof_owner_id,
      _notif_type,
      _notif_title,
      _voter_name || ' ' || _vote_label || ' your proof in "' || _challenge_title || '"',
      jsonb_build_object('challenge_id', _challenge_id, 'proof_id', NEW.proof_id, 'voter_id', NEW.voter_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger for votes
DROP TRIGGER IF EXISTS on_vote_created ON public.votes;
CREATE TRIGGER on_vote_created
  AFTER INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.notify_proof_voted();

-- 3. Update ranking trigger to use distinct message for rank-up
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
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = NEW.user_id 
        AND type = 'ranking_up' 
        AND (data->>'challenge_id')::uuid = NEW.challenge_id
        AND created_at > now() - interval '1 hour'
      ) THEN
        SELECT title INTO _challenge_title FROM challenges WHERE id = NEW.challenge_id;
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'ranking_up',
          '📈 You moved up in ranking!',
          'You''ve reached the top of the ranking in "' || _challenge_title || '"!',
          jsonb_build_object('challenge_id', NEW.challenge_id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
