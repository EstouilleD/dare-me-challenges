-- =============================================================
-- Seed: 20 diverse public challenges (English & French)
-- Creator: admin user 553c7d72-5157-433d-adcb-ab3d3cfb7c30
-- Run this in the Supabase SQL Editor
-- =============================================================

INSERT INTO public.challenges (
  id, owner_id, title, description,
  type_id, category_id,
  is_public, status,
  start_date, end_date,
  ask_numeric_score,
  frequency_quantity, frequency_period,
  quantity_target,
  community_id, community_only, is_surprise
) VALUES

-- ── SPORT / FITNESS ──────────────────────────────────────────

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  '30-Day Running Streak 🏃',
  'Go for a run every single day for 30 days. Distance doesn''t matter — even 10 minutes counts. Lace up and get moving!',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'sports'),
  true, 'active',
  now(), now() + interval '30 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  '10 000 pas par jour pendant 30 jours 👟',
  'Marche au moins 10 000 pas chaque jour pendant 30 jours. Utilise un podomètre ou ton smartphone pour comptabiliser tes pas et prendre soin de ta santé !',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'fitness'),
  true, 'active',
  now(), now() + interval '30 days',
  false, 10000, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  '100 Push-Ups Challenge 💪',
  'Complete 100 push-ups in total within 30 days. Split them however you like — 10 a day, 50 twice, all at once. Just get to 100!',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'fitness'),
  true, 'active',
  now(), now() + interval '30 days',
  false, null, null, 100, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Défi natation : 20 longueurs 🏊',
  'Nagez 20 longueurs de piscine au total dans les 60 prochains jours. Crawl, brasse, dos crawlé — tous les styles comptent. Plongez !',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'sports'),
  true, 'active',
  now(), now() + interval '60 days',
  false, null, null, 20, null, false, false
),

-- ── CREATIVE ─────────────────────────────────────────────────

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Photo of the Day 📸',
  'Take one photo every day for 30 days that captures something beautiful, funny or meaningful to you. Share your unique perspective with the world!',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'creative'),
  true, 'active',
  now(), now() + interval '30 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Dessine chaque jour pendant 14 jours ✏️',
  'Réalise un dessin chaque jour pendant 14 jours. Peu importe le sujet, le style ou ton niveau — griffonnage, aquarelle, numérique, tout compte. L''important, c''est de créer !',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'creative'),
  true, 'active',
  now(), now() + interval '14 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Write a Short Story ✍️',
  'Write a short story of at least 500 words in any genre you like — adventure, romance, sci-fi, horror. Share it as your proof and inspire others!',
  (SELECT id FROM public.challenge_types WHERE name = 'Creative'),
  (SELECT id FROM public.categories WHERE slug = 'creative'),
  true, 'active',
  now(), now() + interval '14 days',
  false, null, null, null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Compose ta première mélodie 🎵',
  'Compose une courte mélodie originale avec n''importe quel instrument, application ou même ta voix. Même 30 secondes suffisent — montre-nous ce que tu as créé !',
  (SELECT id FROM public.challenge_types WHERE name = 'Creative'),
  (SELECT id FROM public.categories WHERE slug = 'music'),
  true, 'active',
  now(), now() + interval '21 days',
  false, null, null, null, null, false, false
),

-- ── SOCIAL ───────────────────────────────────────────────────

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Random Acts of Kindness 😊',
  'Perform one random act of kindness every day for 7 days. Hold a door, pay a genuine compliment, help a neighbor or a stranger. Every small gesture matters!',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'social'),
  true, 'active',
  now(), now() + interval '7 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Écris 5 lettres manuscrites 💌',
  'Écris et envoie 5 lettres manuscrites à des proches, amis ou même des inconnus. À l''ère du numérique, rien ne vaut le charme et la chaleur d''une vraie lettre !',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'social'),
  true, 'active',
  now(), now() + interval '30 days',
  false, null, null, 5, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Organize a Community Cleanup 🌱',
  'Organize or join a cleanup event in your neighborhood, park or beach. Take a before-and-after photo as your proof. Make your community a better place!',
  (SELECT id FROM public.challenge_types WHERE name = 'Creative'),
  (SELECT id FROM public.categories WHERE slug = 'social'),
  true, 'active',
  now(), now() + interval '30 days',
  false, null, null, null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Retrouve 3 personnes perdues de vue 🤗',
  'Contacte et retrouve 3 personnes que tu n''as pas vues depuis longtemps — un ami d''enfance, un ancien collègue, un voisin. Un simple message peut changer une journée !',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'social'),
  true, 'active',
  now(), now() + interval '30 days',
  false, null, null, 3, null, false, false
),

-- ── WELLNESS ─────────────────────────────────────────────────

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  '21-Day Meditation Challenge 🧘',
  'Meditate for at least 5 minutes every day for 21 days. Use any app, YouTube guide or simply focus on your breathing. Consistency is the key to calm.',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'wellness'),
  true, 'active',
  now(), now() + interval '21 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Yoga du matin — 14 jours 🌅',
  'Pratique 15 minutes de yoga chaque matin pendant 14 jours. Commence ta journée avec sérénité, souplesse et énergie positive. Débutants bienvenus !',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'wellness'),
  true, 'active',
  now(), now() + interval '14 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Digital Detox Before Bed 📵',
  'Put your phone, tablet and laptop away at least 1 hour before bedtime for 14 consecutive nights. Better sleep, clearer mind — starting tonight!',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'wellness'),
  true, 'active',
  now(), now() + interval '14 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Bois 2 litres d''eau par jour 💧',
  'Hydrate-toi en buvant au moins 2 litres d''eau chaque jour pendant 30 jours. Note ta consommation, prends soin de toi et ressens la différence sur ta peau et ton énergie !',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'wellness'),
  true, 'active',
  now(), now() + interval '30 days',
  false, 2, 'day', null, null, false, false
),

-- ── FUN ──────────────────────────────────────────────────────

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Cook 5 New Recipes 🍳',
  'Cook 5 recipes you''ve never tried before within 30 days. Take a photo of each finished dish as proof. Explore world cuisines and expand your kitchen skills!',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'cooking'),
  true, 'active',
  now(), now() + interval '30 days',
  false, null, null, 5, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Apprends 10 mots dans une nouvelle langue 🌍',
  'Apprends 10 mots ou expressions dans une langue que tu ne parles pas encore. Espagnol, japonais, arabe, swahili — à toi de choisir ! Partage une photo de tes notes.',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'learning'),
  true, 'active',
  now(), now() + interval '14 days',
  false, null, null, 10, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Catch a Sunrise or Sunset Every Day 🌅',
  'Watch and photograph a sunrise or sunset every day for 7 days. Nature''s most beautiful free show — wake up early or stay up late, it''s worth it!',
  (SELECT id FROM public.challenge_types WHERE name = 'Frequency'),
  (SELECT id FROM public.categories WHERE slug = 'other'),
  true, 'active',
  now(), now() + interval '7 days',
  false, 1, 'day', null, null, false, false
),

(
  gen_random_uuid(),
  '553c7d72-5157-433d-adcb-ab3d3cfb7c30',
  'Une nouvelle activité chaque semaine 🎲',
  'Essaie une toute nouvelle activité chaque semaine pendant 4 semaines : cuisine exotique, sport inconnu, atelier créatif, randonnée, bénévolat... Surprends-toi toi-même !',
  (SELECT id FROM public.challenge_types WHERE name = 'Quantity'),
  (SELECT id FROM public.categories WHERE slug = 'other'),
  true, 'active',
  now(), now() + interval '28 days',
  false, null, null, 4, null, false, false
);

-- Verify insertion
SELECT id, title, status, is_public, start_date::date, end_date::date
FROM public.challenges
WHERE owner_id = '553c7d72-5157-433d-adcb-ab3d3cfb7c30'
ORDER BY created_at DESC
LIMIT 20;
