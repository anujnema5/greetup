-- SELECT * FROM public.rooms 
-- ORDER BY created_at DESC limit 10;

-- BEGIN;

-- DELETE FROM public.conversations
-- WHERE room_id IN (SELECT id FROM public.rooms WHERE room_type = 'circle');

-- DELETE FROM public.rooms
-- WHERE room_type = 'circle';

-- COMMIT;

BEGIN;

WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com')
DELETE FROM message_reactions WHERE user_id IN (SELECT id FROM u);

WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com')
DELETE FROM message_read_receipts WHERE user_id IN (SELECT id FROM u);

WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com')
DELETE FROM pinned_messages WHERE pinned_by IN (SELECT id FROM u);

WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com')
DELETE FROM messages WHERE sender_id IN (SELECT id FROM u);

WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com')
DELETE FROM conversation_participants WHERE user_id IN (SELECT id FROM u);

UPDATE conversations
SET expanded_by_user_id = NULL
WHERE expanded_by_user_id IN (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com');

-- removes 1:1 connection conversations tied to this user, avoiding the
-- conversations_connection_id_user_connections_id_fk violation
WITH u AS (SELECT id FROM users WHERE email = 'anujnemacoding@gmail.com'),
     conn AS (
       SELECT id FROM user_connections
       WHERE requester_id IN (SELECT id FROM u) OR addressee_id IN (SELECT id FROM u)
     )
DELETE FROM conversations WHERE connection_id IN (SELECT id FROM conn);

DELETE FROM users WHERE email = 'anujnemacoding@gmail.com';

COMMIT;