-- =============================================================================
-- helpers/prod/postgres.sql — production / staging Managed PostgreSQL
-- Cluster: greetup-db | DB: greetup_db | Region: BLR1
--
-- SAFETY
--   • Prefer SELECTs. Treat every UPDATE/DELETE as an incident action.
--   • Always wrap writes in BEGIN … ROLLBACK first; only COMMIT when sure.
--   • From laptop: public host + trusted IP, sslmode=no-verify (see deploy/do).
--   • App Platform uses private host + sslmode=require (or no-verify per runbook).
--   • NEVER run db:clean / DROP DATABASE / TRUNCATE against prod.
--
-- Connect (laptop example — fill password + public host yourself):
--   $env:PGPASSWORD='…'
--   psql "postgresql://doadmin@PUBLIC-HOST:25060/greetup_db?sslmode=no-verify"
-- =============================================================================

-- ── Connectivity / extensions ────────────────────────────────────────────────

-- SELECT current_database(), current_user, now(), version();
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp');
-- SELECT * FROM schema_migrations ORDER BY id;

-- ── Health counts (safe) ─────────────────────────────────────────────────────

-- SELECT
--   (SELECT count(*) FROM users) AS users,
--   (SELECT count(*) FROM user_profiles WHERE is_guest) AS guests,
--   (SELECT count(*) FROM user_profiles WHERE is_onboarded AND NOT is_guest) AS onboarded,
--   (SELECT count(*) FROM rooms WHERE status = 'live') AS live_rooms,
--   (SELECT count(*) FROM rooms WHERE status = 'live' AND room_type = 'space') AS live_spaces,
--   (SELECT count(*) FROM rooms WHERE status = 'live' AND room_type = 'direct') AS live_direct,
--   (SELECT count(*) FROM user_connections WHERE status = 'accepted') AS accepted_connections,
--   (SELECT count(*) FROM connect_requests WHERE status = 'pending') AS pending_connects,
--   (SELECT count(*) FROM current_status
--    WHERE availability = 'available' AND open_to_connect
--      AND NOT open_to_connect_paused_for_room) AS open_to_connect,
--   (SELECT count(*) FROM problem_reports WHERE status = 'open') AS open_reports,
--   (SELECT count(*) FROM notifications WHERE read_at IS NULL) AS unread_notifications;

-- Signups last 24h / 7d
-- SELECT
--   count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS users_24h,
--   count(*) FILTER (WHERE created_at > now() - interval '7 days') AS users_7d
-- FROM users;

-- Guest funnel (DB events)
-- SELECT event_type, count(*) AS n
-- FROM guest_trial_events
-- WHERE created_at > now() - interval '7 days'
-- GROUP BY event_type
-- ORDER BY n DESC;

-- ── Incident lookups ─────────────────────────────────────────────────────────

-- User by email / username
-- SELECT u.id, u.email, u.username, u.display_name, u.is_banned, u.created_at,
--        up.is_guest, up.is_onboarded, up.guest_trial_consumed_at, up.guest_converted_at
-- FROM users u
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- WHERE u.email = 'user@example.com';
-- -- WHERE u.username = 'handle';

-- Live rooms (stuck call triage)
-- SELECT r.id, r.title, r.room_type, r.session_kind, r.status, r.started_at,
--        r.expires_at, r.is_expired, u.username AS host,
--        (SELECT count(*) FROM room_participants rp
--         WHERE rp.room_id = r.id AND rp.left_at IS NULL) AS active_n
-- FROM rooms r
-- JOIN users u ON u.id = r.host_user_id
-- WHERE r.status = 'live'
-- ORDER BY r.started_at DESC NULLS LAST
-- LIMIT 50;

-- Expired but still live
-- SELECT id, title, room_type, session_kind, status, expires_at, started_at
-- FROM rooms
-- WHERE status = 'live'
--   AND expires_at IS NOT NULL
--   AND expires_at < now()
-- ORDER BY expires_at;

-- Stuck open_to_connect_paused_for_room
-- SELECT u.id, u.username, u.email, cs.open_to_connect,
--        cs.open_to_connect_paused_for_room, cs.last_active_at
-- FROM current_status cs
-- JOIN user_profiles up ON up.id = cs.profile_id
-- JOIN users u ON u.id = up.user_id
-- WHERE cs.open_to_connect_paused_for_room = true
-- ORDER BY cs.last_active_at DESC
-- LIMIT 100;

-- Open problem reports
-- SELECT pr.id, pr.source, pr.status, left(pr.description, 120) AS description,
--        pr.room_id, pr.created_at, u.username, u.email
-- FROM problem_reports pr
-- JOIN users u ON u.id = pr.user_id
-- WHERE pr.status = 'open'
-- ORDER BY pr.created_at DESC
-- LIMIT 50;

-- Stale pending connect requests
-- SELECT id, requester_user_id, target_user_id, expires_at, created_at
-- FROM connect_requests
-- WHERE status = 'pending'
--   AND expires_at < now()
-- ORDER BY expires_at
-- LIMIT 100;

-- Orphan conversations (room deleted)
-- SELECT c.id, c.type, c.room_id, c.created_at
-- FROM conversations c
-- LEFT JOIN rooms r ON r.id = c.room_id
-- WHERE c.room_id IS NOT NULL
--   AND r.id IS NULL
-- LIMIT 100;

-- ── Controlled remediations (BEGIN → verify → COMMIT or ROLLBACK) ─────────────

-- End one stuck live room by id
-- BEGIN;
-- UPDATE rooms
-- SET status = 'ended',
--     ended_at = coalesce(ended_at, now()),
--     is_expired = CASE WHEN expires_at IS NOT NULL AND expires_at < now() THEN true ELSE is_expired END,
--     updated_at = now()
-- WHERE id = '<room_id>'::uuid
--   AND status = 'live'
-- RETURNING id, title, status, ended_at;
-- -- ROLLBACK;
-- -- COMMIT;

-- Bulk-end expired live rooms (review RETURNING first)
-- BEGIN;
-- UPDATE rooms
-- SET status = 'ended',
--     is_expired = true,
--     ended_at = coalesce(ended_at, now()),
--     updated_at = now()
-- WHERE status = 'live'
--   AND expires_at IS NOT NULL
--   AND expires_at < now()
-- RETURNING id, title, room_type, expires_at;
-- -- ROLLBACK;
-- -- COMMIT;

-- Clear OTC paused-for-room for one user
-- BEGIN;
-- UPDATE current_status cs
-- SET open_to_connect_paused_for_room = false,
--     updated_at = now()
-- FROM user_profiles up
-- JOIN users u ON u.id = up.user_id
-- WHERE cs.profile_id = up.id
--   AND u.email = 'user@example.com'
-- RETURNING cs.id, u.email, cs.open_to_connect_paused_for_room;
-- -- ROLLBACK;
-- -- COMMIT;

-- Expire stale pending connect requests
-- BEGIN;
-- UPDATE connect_requests
-- SET status = 'expired',
--     responded_at = coalesce(responded_at, now())
-- WHERE status = 'pending'
--   AND expires_at < now()
-- RETURNING id, requester_user_id, target_user_id;
-- -- ROLLBACK;
-- -- COMMIT;

-- Ban / unban a user (enum: yes | no | temporarily)
-- BEGIN;
-- UPDATE users
-- SET is_banned = 'yes', updated_at = now()
-- WHERE email = 'user@example.com'
-- RETURNING id, email, username, is_banned;
-- -- ROLLBACK;
-- -- COMMIT;

-- Resolve a problem report
-- BEGIN;
-- UPDATE problem_reports
-- SET status = 'resolved'
-- WHERE id = '<report_id>'::uuid
-- RETURNING id, status, description;
-- -- ROLLBACK;
-- -- COMMIT;
