# Shelved

A Letterboxd for games. Import your Steam library in one paste, rate and review what
you have played, follow other players, and get recommendations built from vector
similarity over the games you have actually put hours into.

- **Frontend** — Next.js 16 (App Router) · TypeScript · Tailwind v4 · Clerk — [`shelved/`](shelved)
- **Backend** — Python · FastAPI · arq · Upstash Redis — [`../shelved_api`](../shelved_api)
- **Database** — Postgres via Supabase, with pgvector — [`supabase/migrations`](supabase/migrations)

---

## What it does

| Feature | Where |
|---|---|
| Email + Google sign-in | Clerk, `proxy.ts` |
| Game search over the RAWG catalogue | `/search` |
| Steam library import (every game, every hour) | `/import` → FastAPI → Redis → worker |
| Library with status filters and playtime | `/library` |
| Game pages with description, average rating and reviews | `/games/[gameId]` |
| 1–5 star ratings and written reviews | `/games/[gameId]` |
| Public profiles with stats and completion rate | `/users/[username]` |
| Follow system | `friendships` table, `FollowButton` |
| Activity feed from people you follow | `/` |
| "Because you played X" recommendations | `GET /recommendations/{user_id}` |

---

## Running it locally

### 1. Database

Open the Supabase dashboard → **SQL Editor** → **New query**, paste the whole of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
It creates every table, enables `pgvector`, adds the `match_games` similarity
function and turns on Realtime for `sync_jobs`.

### 2. Frontend

```bash
cd shelved
npm install
npm run dev
```

Fill in [`shelved/.env.local`](shelved/.env.example). The one value that is not
optional is `SUPABASE_SECRET_KEY` — nothing persists without it.

### 3. Backend

```bash
cd ../shelved_api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

And in a second terminal, the worker that actually does the Steam fetching:

```bash
arq app.worker.WorkerSettings
```

`GET http://localhost:8000/` reports which integrations are configured, which is the
fastest way to see what is still missing.

### 4. Embeddings (optional, for recommendations)

```bash
python -m scripts.generate_embeddings
```

Re-runnable: it only touches games with no embedding unless you pass `--all`.

---

## Environment variables

| Variable | Where | Required for |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | web | Auth |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | web + api | Everything that persists |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | Realtime sync progress |
| `API_BASE_URL` | web | Steam import, recommendations |
| `STEAM_API_KEY` | api | Steam import |
| `REDIS_URL` | api | Job queue |
| `RAWG_API_KEY` | web + api | Game search, covers, genres |
| `OPENAI_API_KEY` | api | Embeddings and recommendations |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | both | Error monitoring |

---

## Architecture, and why

```
Browser ──► Next.js server actions ──► Supabase (secret key)
   │                 │
   │                 └──► FastAPI  ──► Redis queue ──► arq worker ──► Supabase
   │                         │                                           │
   │                         └──► pgvector similarity search             │
   └──────────── Supabase Realtime (sync job progress) ◄─────────────────┘
```

### Why a job queue instead of a synchronous API call?

`GetOwnedGames` for a large account returns thousands of entries, and the import then
writes a row per game across two tables. Done inside the HTTP request that would be
tens of seconds — long enough to hit the default 30-second timeout on most hosts, and
long enough that a dropped connection loses the whole import.

So `POST /sync-steam` does the one thing that must be synchronous (resolving and
validating the Steam ID, so a typo comes back as a `400` immediately), pushes a job
onto Redis, and returns `202 Accepted` with a job id. An arq worker does the slow
part. The browser subscribes to that job's row in `sync_jobs` over Supabase Realtime
and redirects the moment it flips to `complete`. A slow poll runs alongside the
subscription, because a websocket that is blocked by a corporate proxy should degrade
to "a bit slower", not "spins forever".

### Why the browser never talks to Postgres

Every read and write goes through server code — server components, server actions, or
FastAPI — using the Supabase **secret** key. RLS is enabled on every table with
effectively no policies, so even if the publishable key leaks (it is public by
design), it opens nothing. Authorisation lives in one place: the server actions in
[`lib/actions.ts`](shelved/lib/actions.ts), each of which starts by resolving the
Clerk session to a `users` row.

The single exception is `sync_jobs`, which the browser may read so Realtime can
deliver sync progress. Job ids are random UUIDs and the rows contain nothing
sensitive.

### Why Clerk users are synced lazily instead of by webhook

`ensureUser()` resolves the Clerk session to a `users` row and creates it on first
visit. The webhook alternative means a signing secret, a public endpoint, and an app
that silently half-works until you remember to configure it in a new environment.
Lazily is one function call on a path that already runs on every request.

### Why pgvector instead of something simpler

The naive version is "recommend more games in the genres you play", which returns the
same six genres to everybody and cannot tell *Disco Elysium* from *Baldur's Gate 3*
just because both are tagged RPG. Embedding title + genres + description into a
1536-dimension vector captures tone and subject matter that genre tags flatten away.

`GET /recommendations/{user_id}` takes the five games you have played most, averages
their vectors into one "taste profile", and runs a cosine nearest-neighbour search
(an `ivfflat` index over `games.embedding`) excluding everything you already own. The
"because you played X" line comes from comparing each result back against those five
seeds individually — the average tells you *what* to recommend, but it cannot explain
itself, so the explanation is computed separately.

---

## What broke along the way

**Clerk v7 removed `<SignedIn>` and `<SignedOut>`.** They are replaced by a single
`<Show when="signed-in">`. Nothing in the older tutorials mentions this and the error
is a bare "has no exported member", so it reads like a broken install rather than an
API change.

**PostgREST cannot cast a JSON array to `vector`.** Passing the taste profile as a
list of floats to the `match_games` RPC fails, because the JSON array has no cast to
`vector(1536)`. The function takes `text` and casts internally, and the caller sends
a `'[0.1,0.2,…]'` literal.

**The API refused to boot when Redis was unreachable.** Connecting in the FastAPI
lifespan meant a dead Redis host took down `/recommendations` and `/` too. The pool is
now created on first use, so a queue outage degrades exactly one endpoint.

**Re-syncing Steam wiped manually-set statuses.** The first version upserted
`user_games` wholesale, so marking something "dropped" and re-importing reset it to
"playing". The worker now reads existing statuses first and only sets one for rows it
is creating.

**Next.js picked the wrong workspace root.** A stray `package-lock.json` further up
the home directory made Turbopack infer the wrong root; `turbopack.root` is now pinned
in `next.config.ts`.

---

## What I would do differently

- **Generate Supabase types.** `supabase gen types typescript` would remove every
  `as unknown as T` cast in `lib/queries.ts`. Those casts are the weakest part of the
  codebase — they compile, but they are a promise, not a proof.
- **Match Steam games to RAWG by app ID, not by title.** RAWG stores Steam store
  links, so the match could be exact. Title matching mangles anything with a subtitle,
  a colon, or a re-release.
- **Rethink recommendations for people with one taste.** Averaging five vectors from
  someone who only plays roguelikes produces a vector that recommends more
  roguelikes. Clustering the library and recommending per-cluster would be better.
- **Put the two repos in one monorepo.** The split means two CI pipelines and two
  deploys for changes that are often a single feature.

---

## Deploying

**Frontend → Vercel.** Import the repo, set **Root Directory** to `shelved`, add the
environment variables from the table above. Every push to `main` deploys.

**Backend → Railway.** Import `shelved_api`. The [`Procfile`](../shelved_api/Procfile)
declares both processes:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
worker: arq app.worker.WorkerSettings
```

Create **two** Railway services from the same repo — one running `web`, one running
`worker` — and give both the same environment variables. Set `CORS_ORIGINS` to your
Vercel URL, and point the frontend's `API_BASE_URL` at the Railway URL.

**CI** runs on every push: [`ci.yml`](.github/workflows/ci.yml) lints, typechecks and
builds the frontend; the backend's own workflow runs `pytest`.

**Monitoring.** Set `SENTRY_DSN` (backend) and `NEXT_PUBLIC_SENTRY_DSN` (frontend).
Both are no-ops when unset.
