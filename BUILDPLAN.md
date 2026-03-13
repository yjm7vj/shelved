# Gameboxd — Build Plan

> A Letterboxd-style game tracking app with Steam library import, reviews, social features, and AI recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui |
| Backend | Python + FastAPI |
| Database | PostgreSQL via Supabase (with pgvector) |
| Auth | Clerk (email + Google + Steam OpenID) |
| Job Queue | Redis via Upstash |
| Game Data | RAWG API or IGDB |
| Steam Data | Steam Web API |
| AI | OpenAI embeddings + pgvector similarity search |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |
| Monitoring | Sentry |
| CI/CD | GitHub Actions |

---

## Phase 1 — Project Setup + Auth + Database
**Timeline: Weeks 1–3**

### What to learn first
- Next.js 14 basics — work through the official tutorial at nextjs.org. Focus on App Router, pages, and components.
- TypeScript fundamentals — types, interfaces, and how they layer onto JavaScript. The Total TypeScript free beginner course covers enough to get started in 2–3 hours.

### Steps

**Step 1 — Scaffold the Next.js project**
```bash
npx create-next-app@latest gameboxd --typescript --tailwind
```
Push to a GitHub repo immediately. This is your home base for the whole project.

**Step 2 — Set up Supabase**
- Create a free project at supabase.com
- Copy your connection string into a `.env.local` file
- Never commit `.env` files — add them to `.gitignore`

**Step 3 — Design and create your DB schema**

This is the most important step in Phase 1. Get it right before writing any API calls.

Core tables:
- `users` — id, clerk_id, username, bio, avatar_url, created_at
- `games` — id, rawg_id, title, cover_url, description, genres, embedding (vector)
- `user_games` — id, user_id, game_id, hours_played, status (playing/completed/backlog/dropped), created_at
- `reviews` — id, user_id, game_id, body, rating (1–5), created_at
- `friendships` — id, follower_id, following_id, created_at

**Step 4 — Add auth with Clerk**
- Install Clerk and add email + Google login
- Protect routes so only logged-in users can add games or write reviews
- Connect Clerk user IDs to your `users` table in Supabase

**Step 5 — Build a basic game search page**
- Hit the RAWG API to search games by name
- Display results as a grid with cover art and title
- Use Tailwind + shadcn/ui components to make it look good

---

## Phase 2 — Steam Integration + Background Jobs
**Timeline: Weeks 4–8**

> ⚠️ This is the hardest phase. You're switching languages and learning async programming simultaneously. Budget extra time and expect to get stuck — that's normal.

### What to learn first
- Python + FastAPI basics — work through the official FastAPI tutorial at fastapi.tiangolo.com. Focus on routes, Pydantic models, and async functions. Give this a full week.

### Steps

**Step 6 — Get a Steam Web API key**
- Register at steamcommunity.com/dev/apikey (free and instant)
- Read the docs for these two endpoints before writing any code:
  - `GetPlayerSummaries` — checks if a profile is public
  - `GetOwnedGames` — returns every game with hours played

**Step 7 — Build the FastAPI backend**
- Create a new repo for your Python backend
- Build one endpoint to start: `POST /sync-steam`
  - Accepts a Steam ID
  - Calls `GetPlayerSummaries` to verify the profile is public
  - Calls `GetOwnedGames` to fetch game list + hours
  - Returns structured data
- Test it manually with a public Steam profile before wiring up the frontend

**Step 8 — Set up Upstash Redis + job queue**
- Create a free Redis instance at upstash.com
- Use `arq` or `rq` (Python libraries) to convert Steam syncing into a background job
- The API endpoint should push a job to the queue and return `202 Accepted` immediately
- The worker processes the job async — no request timeouts

**Step 9 — Build the Steam import UI**
- A page where users paste their Steam profile URL or Steam ID
- Show a loading/syncing state while the background job runs
- Use Supabase Realtime to detect when the sync job completes and trigger a redirect

**Step 10 — Build the game library page**
- Display the user's imported games with:
  - Cover art (from RAWG, matched by name or Steam app ID)
  - Hours played (from Steam)
  - Status badge (playing / completed / backlog / dropped)
- This is your hero feature — make it look great

---

## Phase 3 — Reviews, Ratings + Social
**Timeline: Weeks 9–13**

### Steps

**Step 11 — Build game detail pages**
- Dynamic routes: `/games/[gameId]`
- Show: cover art, description, average rating, list of user reviews
- Pull game metadata from RAWG/IGDB

**Step 12 — Add reviews and star ratings**
- Users can write a review and give a 1–5 star rating
- Store in the `reviews` table
- Show the average rating on the game detail page
- Auto-fill the game if it's already in the user's Steam library

**Step 13 — Build user profile pages**
- Public profile at `/users/[username]`
- Show: avatar, bio, games played, total hours, recent reviews, completion stats
- This is what users share with each other — make it visually polished

**Step 14 — Add the follow system**
- Users can follow each other
- Store in the `friendships` table with `follower_id` and `following_id`
- Show follower/following counts on profiles

**Step 15 — Build the activity feed**
- Home page feed showing recent activity from followed users
- Events to show: completed a game, wrote a review, added to backlog
- Query: reviews + user_games ordered by `created_at` filtered to followed user IDs

---

## Phase 4 — AI Recommendations
**Timeline: Weeks 14–17**

### What to learn first
- Read the OpenAI embeddings guide (platform.openai.com/docs/guides/embeddings)
- Read the pgvector README on GitHub
- Core concept: convert text to a list of numbers (a vector), then find similar vectors with a nearest-neighbor search

### Steps

**Step 16 — Enable pgvector on Supabase**
```sql
create extension vector;
alter table games add column embedding vector(1536);
```
Follow the Supabase pgvector quickstart guide exactly.

**Step 17 — Generate and store game embeddings**
- Write a one-time Python script that:
  - Fetches each game's name + genres + description
  - Calls OpenAI's `text-embedding-3-small` API
  - Stores the returned vector in the `games.embedding` column
- Run this script once for your game catalog

**Step 18 — Build the recommendation endpoint**

In FastAPI, a new endpoint `GET /recommendations/{user_id}`:
1. Fetch the user's top 5 most-played games
2. Load their embedding vectors from the DB
3. Average the vectors into one "taste profile" vector
4. Run a pgvector nearest-neighbor search against all games
5. Filter out games the user already owns
6. Return the top 10 results with the closest-matching owned game as the reason

**Step 19 — Add "Recommended for You" UI**
- A section on the user's home feed
- Show recommended games with cover art + "Because you played [X]" explanation
- Pull the reason from whichever owned game had the closest embedding match

---

## Phase 5 — Deploy + Cloud + Polish
**Timeline: Weeks 18–20**

### Steps

**Step 20 — Deploy frontend to Vercel**
- Connect your GitHub repo to Vercel at vercel.com
- It auto-detects Next.js — no config needed
- Add environment variables in the Vercel dashboard (Supabase URL, Clerk keys, etc.)
- Every push to `main` auto-deploys

**Step 21 — Deploy backend to Railway**
- Connect your FastAPI repo to Railway at railway.app
- Add a `Procfile` with your start command:
  ```
  web: uvicorn main:app --host 0.0.0.0 --port $PORT
  worker: arq app.worker.WorkerSettings
  ```
- Add environment variables in the Railway dashboard
- Railway detects Python automatically

**Step 22 — Set up GitHub Actions CI/CD**

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest
```
Even a basic pipeline is worth listing as CI/CD experience on your resume.

**Step 23 — Add monitoring with Sentry**
- Create a free account at sentry.io
- Install the Sentry SDK in both the Next.js frontend and FastAPI backend
- Takes about an hour — now you can see real errors from real users

**Step 24 — Get real users + collect metrics**
- Share in: r/patientgamers, r/SteamDeals, gaming Discord servers, with friends
- Target: 20–50 real users
- Track and note down:
  - Monthly active users
  - Steam profiles successfully imported
  - Total reviews written
  - Total hours logged
- These numbers go on your resume

**Step 25 — Write the README and case study**

Your README should answer:
- What does this project do?
- What is the architecture and why did you structure it this way?
- Why did you use a background job queue instead of a synchronous API call?
- Why pgvector for recommendations instead of a simpler approach?
- What broke during development and how did you fix it?
- What would you do differently if you started over?

Interviewers read this before your interview. A well-written README that explains your decisions is a significant differentiator.

---

## Resume Checkpoint Timeline

| Milestone | Resume value |
|---|---|
| After Phase 1 | Listable as in-progress |
| After Phase 2 (Steam sync working + deployed) | Worth listing — genuinely impressive |
| After Phase 3 (reviews + social) | Strong full-stack project |
| After Phase 4 (AI recs) | Standout internship resume project |
| After Phase 5 (deployed, real users, metrics) | Top 10–15% of what interviewers will see |

---

## Key Resume Keywords This Project Earns

`Next.js` `TypeScript` `FastAPI` `PostgreSQL` `pgvector` `Redis` `REST API` `OAuth` `Steam Web API` `Vector embeddings` `Background job queues` `Third-party API integration` `Supabase` `Vercel` `Railway` `CI/CD` `GitHub Actions` `AI recommendations` `Sentry` `WebSockets`
