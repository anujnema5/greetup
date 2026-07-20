-- =============================================================================
-- helpers/postgres.sql — local / staging Postgres scrapbook
-- Uncomment a block, replace placeholders, run in your SQL client.
-- Placeholders: 'YOUR_EMAIL@example.com' | 'yourusername' | '<user_id>' | '<room_id>'
-- =============================================================================

-- ── Users / profiles ─────────────────────────────────────────────────────────

-- SELECT u.id, u.email, u.username, u.display_name, u.name, u.is_banned,
--        u.created_at, up.is_onboarded, up.is_guest, up.is_premium,
--        up.profile_completion, up.guest_trial_consumed_at, up.guest_converted_at
-- FROM users u
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- WHERE u.email = 'YOUR_EMAIL@example.com';

-- SELECT u.id, u.email, u.username, u.display_name, u.created_at,
--        up.is_onboarded, up.is_guest, up.profile_completion
-- FROM users u
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- WHERE u.username = 'yourusername';

-- Recent signups
-- SELECT u.id, u.email, u.username, u.created_at, up.is_guest, up.is_onboarded
-- FROM users u
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- ORDER BY u.created_at DESC
-- LIMIT 25;

-- Profile + location + preferences snapshot
-- SELECT u.email, u.username, up.bio, up.gender, up.age, up.profession,
--        ul.city, ul.country, ul.timezone,
--        pp.preferred_gender, pp.distance_preference, pp.min_age, pp.max_age
-- FROM users u
-- JOIN user_profiles up ON up.user_id = u.id
-- LEFT JOIN user_locations ul ON ul.profile_id = up.id
-- LEFT JOIN profile_preferences pp ON pp.profile_id = up.id
-- WHERE u.email = 'YOUR_EMAIL@example.com';

-- Users missing a profile row (should be rare)
-- SELECT u.id, u.email, u.username, u.created_at
-- FROM users u
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- WHERE up.id IS NULL;

-- ── Guest trial ──────────────────────────────────────────────────────────────

-- Active / recent guests
-- SELECT u.id, u.email, u.username, up.guest_trial_consumed_at, up.guest_converted_at,
--        up.guest_device_hash, up.created_at
-- FROM user_profiles up
-- JOIN users u ON u.id = up.user_id
-- WHERE up.is_guest = true
-- ORDER BY up.created_at DESC
-- LIMIT 50;

-- Guest trial funnel (event counts)
-- SELECT event_type, count(*) AS n
-- FROM guest_trial_events
-- GROUP BY event_type
-- ORDER BY n DESC;

-- Events for one guest
-- SELECT e.event_type, e.device_hash, e.ip_hash, e.metadata, e.created_at
-- FROM guest_trial_events e
-- JOIN users u ON u.id = e.guest_user_id
-- WHERE u.email = 'YOUR_EMAIL@example.com'
-- ORDER BY e.created_at DESC;

-- Consumed but not converted
-- SELECT u.id, u.email, u.username, up.guest_trial_consumed_at
-- FROM user_profiles up
-- JOIN users u ON u.id = up.user_id
-- WHERE up.is_guest = true
--   AND up.guest_trial_consumed_at IS NOT NULL
--   AND up.guest_converted_at IS NULL;

-- ── Current status / open-to-connect / match prep ────────────────────────────

-- Who is available + open to connect (discovery pool sketch)
-- SELECT u.id, u.username, u.display_name, cs.availability, cs.open_to_connect,
--        cs.open_to_connect_paused_for_room, cs.match_intent, cs.connection_preference,
--        cs.session_goal, cs.last_active_at
-- FROM current_status cs
-- JOIN user_profiles up ON up.id = cs.profile_id
-- JOIN users u ON u.id = up.user_id
-- WHERE cs.availability = 'available'
--   AND cs.open_to_connect = true
--   AND cs.open_to_connect_paused_for_room = false
--   AND up.is_guest = false
-- ORDER BY cs.last_active_at DESC
-- LIMIT 50;

-- Status + moods + looking-for for one user
-- SELECT u.username, cs.availability, cs.open_to_connect, cs.match_intent,
--        cs.session_goal,
--        (SELECT array_agg(m.display_name)
--         FROM current_status_moods csm
--         JOIN moods m ON m.id = csm.mood_id
--         WHERE csm.current_status_id = cs.id) AS moods,
--        (SELECT array_agg(lf.display_name)
--         FROM current_status_looking_for csl
--         JOIN looking_for_options lf ON lf.id = csl.looking_for_id
--         WHERE csl.current_status_id = cs.id) AS looking_for
-- FROM current_status cs
-- JOIN user_profiles up ON up.id = cs.profile_id
-- JOIN users u ON u.id = up.user_id
-- WHERE u.email = 'YOUR_EMAIL@example.com';

-- Match-prep activities for one user
-- SELECT a.name, a.display_name, csa.detail, csa.sort_order
-- FROM current_status_activities csa
-- JOIN activities a ON a.id = csa.activity_id
-- JOIN current_status cs ON cs.id = csa.current_status_id
-- JOIN user_profiles up ON up.id = cs.profile_id
-- JOIN users u ON u.id = up.user_id
-- WHERE u.email = 'YOUR_EMAIL@example.com'
-- ORDER BY csa.sort_order;

-- Stuck open_to_connect_paused_for_room (user left room but flag stuck)
-- SELECT u.id, u.username, cs.open_to_connect, cs.open_to_connect_paused_for_room,
--        cs.last_active_at
-- FROM current_status cs
-- JOIN user_profiles up ON up.id = cs.profile_id
-- JOIN users u ON u.id = up.user_id
-- WHERE cs.open_to_connect_paused_for_room = true;

-- Clear paused-for-room for one user
-- UPDATE current_status cs
-- SET open_to_connect_paused_for_room = false,
--     updated_at = now()
-- FROM user_profiles up
-- JOIN users u ON u.id = up.user_id
-- WHERE cs.profile_id = up.id
--   AND u.email = 'YOUR_EMAIL@example.com';

-- ── Rooms / participants / invites ───────────────────────────────────────────

-- Recent rooms
-- SELECT r.id, r.title, r.room_type, r.session_kind, r.status, r.visibility,
--        r.is_expired, r.expires_at, r.started_at, r.ended_at, r.created_at,
--        u.username AS host, rc.slug AS category
-- FROM rooms r
-- JOIN users u ON u.id = r.host_user_id
-- JOIN room_categories rc ON rc.id = r.category_id
-- ORDER BY r.created_at DESC
-- LIMIT 25;

-- Live rooms with participant counts
-- SELECT r.id, r.title, r.room_type, r.session_kind, r.status,
--        u.username AS host,
--        count(rp.id) FILTER (WHERE rp.left_at IS NULL) AS active_participants
-- FROM rooms r
-- JOIN users u ON u.id = r.host_user_id
-- LEFT JOIN room_participants rp ON rp.room_id = r.id
-- WHERE r.status = 'live'
-- GROUP BY r.id, u.username
-- ORDER BY r.started_at DESC NULLS LAST;

-- Rooms for one user (hosted or joined)
-- SELECT r.id, r.title, r.room_type, r.session_kind, r.status, r.created_at,
--        CASE WHEN r.host_user_id = u.id THEN 'host' ELSE rp.role::text END AS role
-- FROM users u
-- JOIN rooms r ON r.host_user_id = u.id
--    OR EXISTS (
--         SELECT 1 FROM room_participants rp0
--         WHERE rp0.room_id = r.id AND rp0.user_id = u.id
--       )
-- LEFT JOIN room_participants rp ON rp.room_id = r.id AND rp.user_id = u.id
-- WHERE u.email = 'YOUR_EMAIL@example.com'
-- ORDER BY r.created_at DESC;

-- Participants in a room
-- SELECT rp.role, rp.joined_at, rp.left_at, u.username, u.email
-- FROM room_participants rp
-- JOIN users u ON u.id = rp.user_id
-- WHERE rp.room_id = '<room_id>'::uuid
-- ORDER BY rp.joined_at;

-- Pending friend invites for a user
-- SELECT rfi.status, r.title, inviter.username AS inviter, invitee.username AS invitee,
--        rfi.created_at
-- FROM room_friend_invites rfi
-- JOIN rooms r ON r.id = rfi.room_id
-- JOIN users inviter ON inviter.id = rfi.inviter_user_id
-- JOIN users invitee ON invitee.id = rfi.invitee_user_id
-- WHERE rfi.invitee_user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--   AND rfi.status = 'pending';

-- Room activities
-- SELECT a.display_name, ra.detail, ra.sort_order
-- FROM room_activities ra
-- JOIN activities a ON a.id = ra.activity_id
-- WHERE ra.room_id = '<room_id>'::uuid
-- ORDER BY ra.sort_order;

-- Expired but not marked / ended
-- SELECT id, title, status, expires_at, is_expired, ended_at
-- FROM rooms
-- WHERE expires_at IS NOT NULL
--   AND expires_at < now()
--   AND (is_expired = false OR status = 'live')
-- ORDER BY expires_at;

-- ── Connections / connect requests / blocks ──────────────────────────────────

-- Connections involving a user
-- SELECT uc.id, uc.status, uc.created_at,
--        req.username AS requester, addr.username AS addressee
-- FROM user_connections uc
-- JOIN users req ON req.id = uc.requester_id
-- JOIN users addr ON addr.id = uc.addressee_id
-- WHERE uc.requester_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--    OR uc.addressee_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- ORDER BY uc.created_at DESC;

-- Pending inbound connection requests
-- SELECT uc.id, req.username AS from_user, req.email, uc.created_at
-- FROM user_connections uc
-- JOIN users req ON req.id = uc.requester_id
-- WHERE uc.addressee_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--   AND uc.status = 'pending';

-- Match connect requests (1:1 open-to-connect)
-- SELECT cr.id, cr.status, cr.message, cr.match_score_snapshot, cr.expires_at,
--        cr.created_at, cr.responded_at, cr.room_id,
--        req.username AS requester, tgt.username AS target
-- FROM connect_requests cr
-- JOIN users req ON req.id = cr.requester_user_id
-- JOIN users tgt ON tgt.id = cr.target_user_id
-- WHERE cr.requester_user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--    OR cr.target_user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- ORDER BY cr.created_at DESC
-- LIMIT 50;

-- Stale pending connect requests
-- SELECT id, requester_user_id, target_user_id, expires_at, created_at
-- FROM connect_requests
-- WHERE status = 'pending'
--   AND expires_at < now();

-- Blocks for / against a user
-- SELECT b.created_at, blocker.username AS blocker, blocked.username AS blocked
-- FROM user_blocks b
-- JOIN users blocker ON blocker.id = b.blocker_id
-- JOIN users blocked ON blocked.id = b.blocked_id
-- WHERE b.blocker_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--    OR b.blocked_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com');

-- ── Chat ─────────────────────────────────────────────────────────────────────

-- Conversations for a user
-- SELECT c.id, c.type, c.is_persisted, c.room_id, c.connection_id, c.created_at,
--        c.expanded_at, cp.wants_persistence, cp.last_read_at, cp.history_hidden_before_at
-- FROM conversation_participants cp
-- JOIN conversations c ON c.id = cp.conversation_id
-- WHERE cp.user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- ORDER BY c.updated_at DESC
-- LIMIT 50;

-- Recent messages in a conversation (encrypted payload — for existence/debug only)
-- SELECT m.id, m.message_type, m.sender_id, m.is_deleted, m.created_at,
--        left(m.encrypted_content, 24) AS content_prefix
-- FROM messages m
-- WHERE m.conversation_id = '<conversation_id>'::uuid
-- ORDER BY m.created_at DESC
-- LIMIT 50;

-- Orphan conversations (no room and no connection)
-- SELECT id, type, created_at
-- FROM conversations
-- WHERE room_id IS NULL
--   AND connection_id IS NULL;

-- Conversations pointing at deleted rooms
-- SELECT c.id, c.type, c.room_id, c.created_at
-- FROM conversations c
-- LEFT JOIN rooms r ON r.id = c.room_id
-- WHERE c.room_id IS NOT NULL
--   AND r.id IS NULL;

-- ── Notifications / problem reports ──────────────────────────────────────────

-- Unread notifications
-- SELECT n.type, n.title, n.body, n.entity_type, n.entity_id, n.created_at,
--        actor.username AS actor
-- FROM notifications n
-- LEFT JOIN users actor ON actor.id = n.actor_user_id
-- WHERE n.recipient_user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
--   AND n.read_at IS NULL
--   AND n.archived_at IS NULL
-- ORDER BY n.created_at DESC;

-- Open problem reports
-- SELECT pr.id, pr.source, pr.status, pr.description, pr.room_id, pr.created_at,
--        u.username, u.email
-- FROM problem_reports pr
-- JOIN users u ON u.id = pr.user_id
-- WHERE pr.status = 'open'
-- ORDER BY pr.created_at DESC
-- LIMIT 50;

-- ── Quick counts / health ────────────────────────────────────────────────────

-- SELECT
--   (SELECT count(*) FROM users) AS users,
--   (SELECT count(*) FROM user_profiles WHERE is_guest) AS guests,
--   (SELECT count(*) FROM user_profiles WHERE is_onboarded) AS onboarded,
--   (SELECT count(*) FROM rooms WHERE status = 'live') AS live_rooms,
--   (SELECT count(*) FROM user_connections WHERE status = 'accepted') AS accepted_connections,
--   (SELECT count(*) FROM connect_requests WHERE status = 'pending') AS pending_connects,
--   (SELECT count(*) FROM current_status WHERE availability = 'available' AND open_to_connect) AS open_to_connect,
--   (SELECT count(*) FROM messages) AS messages,
--   (SELECT count(*) FROM problem_reports WHERE status = 'open') AS open_reports;

-- ── Destructive cleanups (local only — wrap in a transaction) ────────────────

-- Wipe all space rooms (+ linked conversations first)
-- BEGIN;
-- DELETE FROM conversations
-- WHERE room_id IN (SELECT id FROM rooms WHERE room_type = 'space');
-- DELETE FROM rooms WHERE room_type = 'space';
-- COMMIT;

-- Wipe all direct/match rooms
-- BEGIN;
-- DELETE FROM conversations
-- WHERE room_id IN (SELECT id FROM rooms WHERE room_type = 'direct');
-- DELETE FROM rooms WHERE room_type = 'direct';
-- COMMIT;

-- Mark expired live rooms as ended
-- BEGIN;
-- UPDATE rooms
-- SET status = 'ended',
--     is_expired = true,
--     ended_at = coalesce(ended_at, now()),
--     updated_at = now()
-- WHERE expires_at IS NOT NULL
--   AND expires_at < now()
--   AND status = 'live';
-- COMMIT;

-- Expire stale pending connect requests
-- BEGIN;
-- UPDATE connect_requests
-- SET status = 'expired',
--     responded_at = coalesce(responded_at, now())
-- WHERE status = 'pending'
--   AND expires_at < now();
-- COMMIT;

-- Delete guest accounts older than 7 days (cascade via users)
-- BEGIN;
-- DELETE FROM users u
-- USING user_profiles up
-- WHERE up.user_id = u.id
--   AND up.is_guest = true
--   AND up.guest_converted_at IS NULL
--   AND up.created_at < now() - interval '7 days';
-- COMMIT;

-- Delete one user by email (FK-safe order for chat + rooms)
-- BEGIN;
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- DELETE FROM message_reactions WHERE user_id IN (SELECT id FROM u);
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- DELETE FROM message_read_receipts WHERE user_id IN (SELECT id FROM u);
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- DELETE FROM pinned_messages WHERE pinned_by IN (SELECT id FROM u);
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- DELETE FROM messages WHERE sender_id IN (SELECT id FROM u);
--
-- UPDATE conversations
-- SET expanded_by_user_id = NULL
-- WHERE expanded_by_user_id IN (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com');
--
-- -- rooms.host_user_id ON DELETE CASCADE removes hosted rooms;
-- -- conversations.room_id has no cascade, so drop those conversations first
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'),
--      hosted AS (SELECT id FROM rooms WHERE host_user_id IN (SELECT id FROM u))
-- DELETE FROM conversations WHERE room_id IN (SELECT id FROM hosted);
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'),
--      conn AS (
--        SELECT id FROM user_connections
--        WHERE requester_id IN (SELECT id FROM u) OR addressee_id IN (SELECT id FROM u)
--      )
-- DELETE FROM conversations WHERE connection_id IN (SELECT id FROM conn);
--
-- WITH u AS (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com')
-- DELETE FROM conversation_participants WHERE user_id IN (SELECT id FROM u);
--
-- DELETE FROM users WHERE email = 'YOUR_EMAIL@example.com';
--
-- COMMIT;
