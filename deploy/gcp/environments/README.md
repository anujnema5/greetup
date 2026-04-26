# Development vs production (GCP)

## Why only the client *needed* a separate prod file at first

The **Next.js client** bakes `NEXT_PUBLIC_*` into the bundle at **docker build** time. Dev and prod almost always use different domains → you need two builds and two Cloud Build configs (or trigger substitution overrides).

**Server, matching-service, rtc-service** Docker images do **not** embed those public URLs. Runtime config is Cloud Run env / Secret Manager (and VM `.env` for rtc). The *same* image can serve dev or prod **if** you attach different secrets and service names.

We still add **`*.production.yaml`** for those services so you can mirror dev: separate triggers, different Cloud Run service names (`server-prod`, etc.), and no accidental overwrite of dev.

## Config files

| Service | Development | Production |
| -------- | ----------- | ---------- |
| client | `cloudbuild.client.yaml` | `cloudbuild.client.production.yaml` |
| server | `cloudbuild.server.yaml` | `cloudbuild.server.production.yaml` |
| matching-service | `cloudbuild.matching.yaml` | `cloudbuild.matching.production.yaml` |
| rtc-service | `cloudbuild.rtc.yaml` | `cloudbuild.rtc.production.yaml` |

Production YAMLs default to **`server-prod`** / **`matching-service-prod`** so one GCP project can host dev and prod side by side. If prod lives in **its own project**, override `_SERVICE` on the trigger to `server` / `matching-service` (or edit the YAML).

`NEXT_PUBLIC_*` (client only) are fixed at **build** time. Changing them requires a new client build.

## VM (`deploy/gcp/vm`)

Postgres / Redis / rtc on the VM are **per-environment**. Production should use its own VM (or managed DB/Redis), not dev connection strings.
