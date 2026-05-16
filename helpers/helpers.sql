-- SELECT * FROM public.rooms 
-- ORDER BY created_at DESC limit 10;

-- BEGIN;

-- DELETE FROM public.conversations
-- WHERE room_id IN (SELECT id FROM public.rooms WHERE room_type = 'circle');

-- DELETE FROM public.rooms
-- WHERE room_type = 'circle';

-- COMMIT;