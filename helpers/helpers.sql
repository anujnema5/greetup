-- SELECT * FROM public.rooms 
-- ORDER BY created_at DESC limit 10;

-- BEGIN;

-- DELETE FROM public.conversations
-- WHERE room_id IN (SELECT id FROM public.rooms WHERE room_type = 'circle');

-- DELETE FROM public.rooms
-- WHERE room_type = 'circle';

-- COMMIT;

-- BEGIN;

-- -- resolve user id
-- WITH u AS (
--   SELECT id FROM users WHERE email = 'user@example.com'
-- )
-- DELETE FROM message_reactions
-- WHERE user_id IN (SELECT id FROM u);

-- WITH u AS (SELECT id FROM users WHERE email = 'user@example.com')
-- DELETE FROM message_read_receipts
-- WHERE user_id IN (SELECT id FROM u);

-- WITH u AS (SELECT id FROM users WHERE email = 'user@example.com')
-- DELETE FROM pinned_messages
-- WHERE pinned_by IN (SELECT id FROM u);

-- WITH u AS (SELECT id FROM users WHERE email = 'user@example.com')
-- DELETE FROM messages
-- WHERE sender_id IN (SELECT id FROM u);

-- WITH u AS (SELECT id FROM users WHERE email = 'user@example.com')
-- DELETE FROM conversation_participants
-- WHERE user_id IN (SELECT id FROM u);

-- UPDATE conversations
-- SET expanded_by_user_id = NULL
-- WHERE expanded_by_user_id IN (
--   SELECT id FROM users WHERE email = 'user@example.com'
-- );

-- DELETE FROM users
-- WHERE email = 'user@example.com';

-- COMMIT;