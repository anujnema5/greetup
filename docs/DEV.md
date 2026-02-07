# Development setup

## Recommended: Docker for deps only, app runs locally

**Why:** Running the backend and client on your machine is faster and gives instant hot reload. Docker is used only for Postgres and Redis so you don’t install them locally.

### 1. Start Postgres and Redis (once per dev session)

From the project root:

```bash
docker compose up postgres redis
```

- Postgres: `localhost:25432` (user `postgres`, password `postgres`, DB `circlo_db`)
- Redis: `localhost:16379`

### 2. Backend

In a terminal:

```bash
cd server
cp .env.example .env   # first time only; fill in secrets
npm install
npm run dev
```

- API: `http://localhost:5050`
- Ensure `server/.env` has:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:25432/circlo_db`
  - `REDIS_URL=redis://localhost:16379`

### 3. Client

In another terminal:

```bash
cd client
npm install
npm run dev
```

- App: `http://localhost:5173`

---

## Alternative: Full Docker

To run everything in Docker (e.g. to match CI or another dev):

```bash
docker compose up
```

- Slower due to volume mounts and file watching; use when you need full container parity.
