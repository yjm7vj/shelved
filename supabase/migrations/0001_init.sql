-- Shelved — initial schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create extension if not exists vector;

-- ---------------------------------------------------------------- users

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  clerk_id    text unique not null,
  username    text unique not null,
  bio         text,
  avatar_url  text,
  steam_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists users_clerk_id_idx on users (clerk_id);
create index if not exists users_username_idx on users (lower(username));

-- ---------------------------------------------------------------- games

create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  rawg_id       integer unique,
  steam_app_id  integer unique,
  title         text not null,
  slug          text,
  cover_url     text,
  description   text,
  genres        text[] not null default '{}',
  released      date,
  embedding     vector(1536),
  created_at    timestamptz not null default now()
);

create index if not exists games_title_idx on games using gin (to_tsvector('english', title));
create index if not exists games_steam_app_id_idx on games (steam_app_id);

-- Approximate nearest-neighbour index for recommendations.
create index if not exists games_embedding_idx
  on games using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------- user_games

do $$ begin
  create type game_status as enum ('playing', 'completed', 'backlog', 'dropped');
exception when duplicate_object then null;
end $$;

create table if not exists user_games (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  game_id       uuid not null references games (id) on delete cascade,
  hours_played  numeric(10, 1) not null default 0,
  status        game_status not null default 'backlog',
  source        text not null default 'manual',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists user_games_user_idx on user_games (user_id, updated_at desc);

-- ---------------------------------------------------------------- reviews

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  game_id     uuid not null references games (id) on delete cascade,
  body        text not null default '',
  rating      smallint not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists reviews_game_idx on reviews (game_id, created_at desc);
create index if not exists reviews_user_idx on reviews (user_id, created_at desc);

-- ---------------------------------------------------------------- friendships

create table if not exists friendships (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references users (id) on delete cascade,
  following_id  uuid not null references users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists friendships_follower_idx on friendships (follower_id);
create index if not exists friendships_following_idx on friendships (following_id);

-- ---------------------------------------------------------------- sync_jobs
-- Tracks Steam imports so the browser can watch progress over Supabase Realtime
-- instead of polling the FastAPI backend.

create table if not exists sync_jobs (
  id          uuid primary key default gen_random_uuid(),
  job_id      text unique not null,
  user_id     uuid references users (id) on delete cascade,
  steam_id    text not null,
  status      text not null default 'queued',  -- queued | running | complete | failed
  game_count  integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sync_jobs_job_id_idx on sync_jobs (job_id);

do $$ begin
  alter publication supabase_realtime add table sync_jobs;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------- RLS
-- Every read and write goes through server code (Next.js server actions and the
-- FastAPI service) using the secret key, which bypasses RLS. The browser only
-- ever holds the publishable key, so policies here deliberately grant it almost
-- nothing — the single exception is watching your own sync job by its random id.

alter table users      enable row level security;
alter table games      enable row level security;
alter table user_games enable row level security;
alter table reviews    enable row level security;
alter table friendships enable row level security;
alter table sync_jobs  enable row level security;

drop policy if exists "sync job readable by id" on sync_jobs;
create policy "sync job readable by id" on sync_jobs for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- recommendations
-- Cosine-distance nearest-neighbour search against a caller-supplied taste
-- vector, excluding games the user already owns.

create or replace function match_games (
  taste_vector text,   -- a '[0.1,0.2,...]' literal; PostgREST cannot cast a JSON array to vector
  owned_ids    uuid[],
  match_count  integer default 10
)
returns table (
  id         uuid,
  title      text,
  cover_url  text,
  genres     text[],
  embedding  vector(1536),
  similarity float
)
language sql stable
as $$
  select g.id,
         g.title,
         g.cover_url,
         g.genres,
         g.embedding,
         1 - (g.embedding <=> taste_vector::vector(1536)) as similarity
  from games g
  where g.embedding is not null
    and not (g.id = any (owned_ids))
  order by g.embedding <=> taste_vector::vector(1536)
  limit match_count;
$$;

-- Keeps updated_at honest on the two tables the feed orders by.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_games_touch on user_games;
create trigger user_games_touch before update on user_games
  for each row execute function touch_updated_at();

drop trigger if exists sync_jobs_touch on sync_jobs;
create trigger sync_jobs_touch before update on sync_jobs
  for each row execute function touch_updated_at();
