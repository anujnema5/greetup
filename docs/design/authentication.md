# Authentication

This document describes how end-user authentication works in this repo: **Better Auth** on the Hono server, **PostgreSQL** sessions, **Google OAuth**, **email/password**, and **Phone OTP over AWS SNS** (OTP generated and verified server-side).

---

## 1. What runs where

| Piece | Location | Role |
|--------|-----------|------|
| Better Auth | `server/src/core/auth/auth.ts` | Sessions, OAuth, email flows, DB adapter; **`user.additionalFields`** registers `phoneNumber`, `username`, etc. (must match Drizzle `users` columns) |
| Phone OTP plugin | `server/src/core/auth/plugins/phone-otp.plugin.ts` | `POST /api/auth/phone-otp/{start,verify}` and `.../update/{start,verify}` |
| OTP store | `server/src/core/auth/otp/` | Generates codes, stores the **hash** in Redis with TTL, verifies (single-use, attempt-capped), and gates sends (cooldown + hourly caps) |
| SNS sender | `server/src/core/sns/` | Publishes the OTP SMS (transactional) via AWS SNS |
| Auth middleware | `server/src/middleware/auth.middleware.ts` | `auth.api.getSession` → `c.set("user", …)` |
| Better Auth React client | `client/src/lib/auth-client.ts` | `useSession`, Google sign-in URLs |
| Phone OTP UI | `client/src/features/auth/context/phone-otp-context.tsx` | `sendOtp` / `confirmOtp` (mode `signin` or `update`) |
| OTP network lib | `client/src/features/auth/lib/phone-otp.ts` | `start`/`verify` calls; server sets the session cookie |

---

## 2. Session model

- After any successful sign-in, Better Auth issues a **signed, HTTP-only cookie** (default name: `better-auth.session_token`; in production may use the `__Secure-` prefix).
- The browser sends this cookie on **credentialed** requests (`credentials: "include"`).
- `auth.api.getSession({ headers })` reads the cookie, validates it, and loads the user from the database.
- **REST** and **Socket.IO** on the Hono host both rely on the same session cookie in the request / handshake.

---

## 3. Sign-in methods

### 3.1 Email and password

- Handled entirely by Better Auth (`emailAndPassword` in `auth.ts`).
- **Email verification** is required for password accounts; Mailjet sends links. URLs are rewritten from `BETTER_AUTH_URL` to the public `SERVER_URL` where needed (`mapAuthUrlToPublicHost`).

### 3.2 Google

- `authClient.signIn.social({ provider: "google", callbackURL })` with `baseURL` pointing at the **Next app origin** so `/api/auth/*` is proxied to Hono (see §4).
- OAuth **redirect URI** on the server is `{SERVER_URL}/api/auth/callback/google` (or equivalent public base).

### 3.3 Phone (OTP over AWS SNS)

The OTP lifecycle is **server-side** — SNS is only an SMS transport (unlike Firebase it does not generate or verify codes).

1. **Client** (`sendOtp`): `POST /api/auth/phone-otp/start` with `{ phone }`.
2. **Server** (`/phone-otp/start`): normalizes to E.164, applies send limits (per-number cooldown + per-number and per-IP hourly caps — `core/auth/otp/otp-rate-limit.ts`), generates an N-digit code, stores its **hash** in Redis with a TTL (`createOtp`), and publishes the SMS via SNS (`sendOtpSms`).
3. **Client** (`confirmOtp`): `POST /api/auth/phone-otp/verify` with `{ phone, code, name? }`.
4. **Server** (`/phone-otp/verify`): `verifyOtp` (constant-time hash compare, single-use, `OTP_MAX_ATTEMPTS` lockout) → **find-or-creates** the user (synthetic email `phone_{random}@phone.greetup.local`) → **`createSession`** → **`setSessionCookie`**, returns JSON.

Phone users typically have **`emailVerified: false`** until you add a separate email verification path. Invalid/expired/wrong codes all return a generic `OTP_INVALID` (detail is logged server-side only).

### 3.4 Change phone (Settings)

1. **Settings** (`/settings`) wraps **Change phone** in `PhoneOtpProvider mode="update"` (same UI, different endpoints).
2. User enters the **new** E.164 number → `POST /api/auth/phone-otp/update/start` (requires the existing session) sends a code.
3. Client confirms → `POST /api/auth/phone-otp/update/verify` with `{ phone, code }` and the **existing** Better Auth session cookie.
4. Server (`/phone-otp/update/verify` in `phone-otp.plugin.ts`): **`sessionMiddleware`** loads the current user → `verifyOtp` → ensures the number is not on **another** account → **`updateUser`** + **`setSessionCookie`**.
5. **`get-session`** normalization includes **`phoneNumber`** from Postgres so the UI shows the current number.

---

## 4. Next.js and cookies (why `/api` is proxied)

The web app is served from the **Next origin** (e.g. `http://localhost:3000`). The API listens on **another port** (e.g. `5300`). Cross-origin XHR from 3000 → 5300 often **does not persist** session cookies the way we need.

**Mitigation** (`client/next.config.ts`):

- **Rewrite** `/api/:path*` → `{API_BACKEND_ORIGIN}/api/:path*` (default `http://localhost:5300`).
- The browser only talks to **`{NEXT_ORIGIN}/api/...`**. Set-Cookie on auth responses is **first-party** for that origin.

Implications:

- **`CURRENT_HOST`** (from `NEXT_PUBLIC_APP_URL`, etc.) is the **browser-facing** host; **`authClient` `baseURL`** uses it.
- **`API_BASE_URL`** defaults to `{CURRENT_HOST}/api` (`client/src/shared/constants/environments.ts`).
- **`NEXT_PUBLIC_SOCKET_SERVER_URL`** stays the **Hono** origin for **Socket.IO** (WebSockets are not covered by the same rewrite). Cookies for host `localhost` are still sent to port 5300 when the browser stores them for `localhost`.

**Middleware** (`client/src/proxy.ts`) calls `sameOriginApiBase(req)` → `req.nextUrl.origin + "/api"` so route-guard session checks use the same origin as the tab.

---

## 5. Server wiring

- **`server/src/http/create-app.ts`**: CORS, then **`GET /api/auth/get-session`** (and trailing slash), then **`app.all("/api/auth/*", auth.handler)`** so Better Auth handles built-in routes **and** the `firebase-phone` plugin route.
- **`trustedOrigins`** in `auth.ts` includes `SERVER_URL` / `BETTER_AUTH_URL` and **`WEB_CLIENT_HOST`** (Next origin) for CSRF-related checks.

---

## 6. Environment variables (auth-related)

**Server** (`server/env/.env.development` — see also `docs/getting-started/development-run.md`):

- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SERVER_URL`, `WEB_CLIENT_HOST`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AWS_SNS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — SNS SMS delivery (IAM principal needs `sns:Publish`). New accounts start in the **SNS SMS sandbox** (delivers only to verified numbers) until you request production access.
- `AWS_SNS_SENDER_ID` — optional alphanumeric Sender ID (unsupported in US/CA — those need a registered 10DLC/toll-free number).
- `OTP_TTL_SEC`, `OTP_LENGTH`, `OTP_MAX_ATTEMPTS` — optional OTP tunables (defaults 300 / 6 / 5).

**Client** (`.env.local`):

- `NEXT_PUBLIC_APP_URL` — Next app origin
- `NEXT_PUBLIC_API_BASE_URL` — optional; defaults to `{NEXT_PUBLIC_APP_URL}/api`
- `NEXT_PUBLIC_SOCKET_SERVER_URL` — Hono + Socket.IO (e.g. `http://localhost:5300`)
- `API_BACKEND_ORIGIN` — optional; used by **Next** rewrites (build-time) to find Hono

_Phone OTP is fully server-side — the client no longer needs any Firebase/SMS config._

---

## 7. Operational checklist

1. **AWS SNS**: IAM principal has `sns:Publish`; account is out of the **SMS sandbox** (or the test number is verified); a `MonthlySpendLimit` + billing alarm are set.
2. **`OTP_SEND_FAILED`**: SNS rejected the publish — check region/credentials, and that the destination country has a valid origination identity (Sender ID where allowed, else 10DLC/toll-free).
3. **401 with `hasSessionCookie: false`**: Browser not sending a cookie — confirm rewrites, **`API_BASE_URL`**, and that you are not mixing `localhost` with `127.0.0.1`.
4. **`OTP_INVALID` / `OTP_TOO_MANY_ATTEMPTS`**: Wrong/expired code, code already used, or `OTP_MAX_ATTEMPTS` exceeded — request a new code. **`OTP_RATE_LIMITED`**: resend cooldown or hourly cap hit.

---

## 8. File index (quick reference)

| File | Purpose |
|------|---------|
| `server/src/core/auth/auth.ts` | Better Auth configuration |
| `server/src/core/auth/plugins/phone-otp.plugin.ts` | Phone OTP start/verify endpoints (sign-in + update) |
| `server/src/core/auth/otp/` | OTP generate/verify store, E.164 helpers, send rate limits |
| `server/src/core/sns/` | AWS SNS client + `sendOtpSms` |
| `server/src/middleware/auth.middleware.ts` | Protected REST routes |
| `server/src/core/socket/socket.ts` | Socket session from cookies |
| `client/next.config.ts` | `/api` → Hono rewrites |
| `client/src/lib/auth-client.ts` | Better Auth React client |
| `client/src/features/auth/context/phone-otp-context.tsx` | Phone OTP UI state; `mode` = `signin` \| `update` |
| `client/src/features/auth/lib/phone-otp.ts` | `start`/`verify` network calls |
| `client/src/features/settings/components/change-phone-dialog.tsx` | Settings UI for changing phone |
| `client/src/features/auth/types/` | Auth-related TS types (e.g. `PhoneOtpSessionResult`) |
| `client/src/features/auth/schemas/auth.schemas.ts` | Zod schemas including phone OTP |

For local runbooks and full env tables, see **[getting-started/development-run.md](../getting-started/development-run.md)**.
