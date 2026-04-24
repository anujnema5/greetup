# Authentication

This document describes how end-user authentication works in this repo: **Better Auth** on the Hono server, **PostgreSQL** sessions, **Google OAuth**, **email/password**, and **Firebase Phone OTP**.

---

## 1. What runs where

| Piece | Location | Role |
|--------|-----------|------|
| Better Auth | `server/src/core/auth/auth.ts` | Sessions, OAuth, email flows, DB adapter; **`user.additionalFields`** registers `phoneNumber`, `username`, etc. (must match Drizzle `users` columns) |
| Custom phone exchange | `server/src/core/auth/plugins/firebase-phone.plugin.ts` | `POST /api/auth/firebase-phone` |
| Firebase Admin | `server/src/core/firebase/admin.ts` | Verifies Firebase **ID tokens** (server only) |
| Auth middleware | `server/src/middleware/auth.middleware.ts` | `auth.api.getSession` → `c.set("user", …)` |
| Better Auth React client | `client/src/lib/auth-client.ts` | `useSession`, Google sign-in URLs |
| Phone OTP UI | `client/src/features/auth/context/firebase-phone-auth-context.tsx` | reCAPTCHA + `signInWithPhoneNumber` |
| Session bridge | `client/src/features/auth/lib/exchange-firebase-session.ts` | Sends ID token to Hono, receives cookie |

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

### 3.3 Firebase Phone (OTP)

1. **Client**: Firebase JS SDK initializes with `NEXT_PUBLIC_FIREBASE_*` (`client/src/lib/firebase/client-app.ts`).
2. Invisible **reCAPTCHA** + `signInWithPhoneNumber` → user receives SMS → `confirmation.confirm(code)`.
3. Client calls `getIdToken()` and **`exchangeFirebaseSession(idToken)`** → `POST /api/auth/firebase-phone` with `{ idToken, name? }`.
4. **Server**: Firebase Admin **`verifyIdToken`** (must use a service account from the **same** Firebase project as the web app). Plugin ensures `phone_number` is present, **find-or-creates** the user (synthetic email `fb_{uid}@firebase.greetup.local`), **`createSession`**, **`setSessionCookie`**, returns JSON.

Phone users typically have **`emailVerified: false`** until you add a separate email verification path.

### 3.4 Change phone (Settings)

1. **Settings** (`/settings`) wraps **Change phone** in `FirebasePhoneAuthProvider` (same Firebase SMS + reCAPTCHA as login).
2. User enters the **new** E.164 number → Firebase sends OTP → user confirms.
3. Client calls **`POST /api/auth/firebase-phone-update`** with `{ idToken }` and the **existing** Better Auth session cookie.
4. Server (`firebase-phone-update` in `firebase-phone.plugin.ts`): **`sessionMiddleware`** loads the current user → verifies the Firebase token → ensures the number is not on **another** account → **`updateUser`** + **`setSessionCookie`**.
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

**Server** (`server/env/.env.development` — see also `development-run.md`):

- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SERVER_URL`, `WEB_CLIENT_HOST`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_PATH` — **recommended**: path to the downloaded service account `.json` (e.g. `./env/firebase-service-account.json`). Standard `.env` files cannot hold multi-line JSON; a pasted multi-line key causes `must be valid JSON` errors.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — optional alternative: the same JSON as a **single line** only. **`project_id` must match** `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

**Client** (`.env.local`):

- `NEXT_PUBLIC_APP_URL` — Next app origin
- `NEXT_PUBLIC_API_BASE_URL` — optional; defaults to `{NEXT_PUBLIC_APP_URL}/api`
- `NEXT_PUBLIC_SOCKET_SERVER_URL` — Hono + Socket.IO (e.g. `http://localhost:5300`)
- `NEXT_PUBLIC_FIREBASE_*` — Firebase web app config
- `API_BACKEND_ORIGIN` — optional; used by **Next** rewrites (build-time) to find Hono

---

## 7. Operational checklist

1. **Firebase Phone**: Enable Phone provider in Firebase Console; **authorized domains** include your Next host.
2. **INVALID_TOKEN** / JSON errors on `/firebase-phone`: **Wrong Firebase project** (client vs service account), **corrupt credentials**, or **multi-line JSON in `.env`** — use `FIREBASE_SERVICE_ACCOUNT_PATH` to a real file instead.
3. **401 with `hasSessionCookie: false`**: Browser not sending a cookie — confirm rewrites, **`API_BASE_URL`**, and that you are not mixing `localhost` with `127.0.0.1`.
4. **INVALID_CODE** (Firebase): Wrong/expired OTP, or code not **6 digits** after normalizing (non-digits stripped client-side).

---

## 8. File index (quick reference)

| File | Purpose |
|------|---------|
| `server/src/core/auth/auth.ts` | Better Auth configuration |
| `server/src/core/auth/plugins/firebase-phone.plugin.ts` | Phone token exchange |
| `server/src/core/firebase/admin.ts` | Firebase Admin singleton |
| `server/src/middleware/auth.middleware.ts` | Protected REST routes |
| `server/src/core/socket/socket.ts` | Socket session from cookies |
| `client/next.config.ts` | `/api` → Hono rewrites |
| `client/src/lib/auth-client.ts` | Better Auth React client |
| `client/src/features/auth/context/firebase-phone-auth-context.tsx` | Phone OTP; sign-in exchange vs **signed-in** phone update |
| `client/src/features/auth/lib/update-account-phone.ts` | `POST /api/auth/firebase-phone-update` |
| `client/src/features/settings/components/change-phone-section.tsx` | Settings UI for changing phone |
| `client/src/features/auth/types/` | Auth-related TS types (e.g. Firebase session exchange) |
| `client/src/features/auth/schemas/auth.schemas.ts` | Zod schemas including phone OTP |

For local runbooks and full env tables, see **[development-run.md](./development-run.md)**.
