-- LinkScout — Schema initial
-- Généré depuis les routes API existantes

-- 1. JOBS
create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    company text not null,
    description text,
    location text,
    url text,
    logo_url text,
    source text not null default 'linkedin_guest',
    status text not null default 'new',
    match_score int,
    summary text,
    tech_stack jsonb,
    salary text,
    contract_type text,
    remote_policy text,
    seniority text,
    score_breakdown jsonb,
    verdict_ai text,
    pitch text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_source on public.jobs(source);
create index if not exists idx_jobs_created_at on public.jobs(created_at desc);
create index if not exists idx_jobs_match_score on public.jobs(match_score desc);
create index if not exists idx_jobs_title_trgm on public.jobs using gin (title gin_trgm_ops);

-- 2. COLLECTIONS (favoris / bookmarks)
create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    job_id uuid not null references public.jobs(id) on delete cascade,
    status text not null default 'bookmarked',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, job_id)
);

create index if not exists idx_collections_user on public.collections(user_id);
create index if not exists idx_collections_status on public.collections(status);

-- 3. ALERTS (Discord / Telegram)
create table if not exists public.alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    keyword text not null,
    platform text not null check (platform in ('discord', 'telegram')),
    webhook_url text not null,
    filters jsonb not null default '{}',
    min_score int not null default 70,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    last_triggered_at timestamptz
);

create index if not exists idx_alerts_user on public.alerts(user_id);
create index if not exists idx_alerts_active on public.alerts(is_active) where is_active = true;

-- 4. RESUMES (CV uploads)
create table if not exists public.resumes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    status text not null default 'uploaded',
    storage_path text not null,
    file_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. SEARCH HISTORY
create table if not exists public.search_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    keyword text not null,
    results_count int,
    created_at timestamptz not null default now()
);

create index if not exists idx_search_history_user on public.search_history(user_id);
create index if not exists idx_search_history_created on public.search_history(created_at desc);

-- 6. USER QUOTA (alternative à Redis pour le suivi multi-instance)
create table if not exists public.user_quota (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    used_count int not null default 0,
    window_start timestamptz not null default now(),
    unique (user_id)
);

-- 7. USER SETTINGS
create table if not exists public.user_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    use_resume_match boolean not null default false,
    active_resume_id uuid references public.resumes(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 8. Add new columns to jobs (if not present in initial create)
alter table public.jobs add column if not exists score_coherence_generale int;
alter table public.jobs add column if not exists score_coherence_cv int;
alter table public.jobs add column if not exists notified boolean not null default false;

create index if not exists idx_jobs_notified on public.jobs(notified) where notified = false;
create index if not exists idx_jobs_score_coherence on public.jobs(score_coherence_cv desc);

-- 9. Enable RLS + basic policies
alter table public.jobs enable row level security;
alter table public.collections enable row level security;
alter table public.alerts enable row level security;
alter table public.resumes enable row level security;
alter table public.search_history enable row level security;
alter table public.user_quota enable row level security;
alter table public.user_settings enable row level security;

-- user_settings: user owns their data
create policy "Users can read own settings"
    on public.user_settings for select
    using (auth.uid() = user_id);
create policy "Users can insert own settings"
    on public.user_settings for insert
    with check (auth.uid() = user_id);
create policy "Users can update own settings"
    on public.user_settings for update
    using (auth.uid() = user_id);

-- Jobs: everyone can read
create policy "Jobs are publicly readable"
    on public.jobs for select
    using (true);

-- Jobs: service role can insert/update (worker)
create policy "Jobs can be upserted by service role"
    on public.jobs for insert
    with check (true);
create policy "Jobs can be updated by service role"
    on public.jobs for update
    using (true);

-- Collections: user owns their data
create policy "Users can read own collections"
    on public.collections for select
    using (auth.uid() = user_id);
create policy "Users can insert own collections"
    on public.collections for insert
    with check (auth.uid() = user_id);
create policy "Users can delete own collections"
    on public.collections for delete
    using (auth.uid() = user_id);

-- Alerts: user owns their data
create policy "Users can read own alerts"
    on public.alerts for select
    using (auth.uid() = user_id);
create policy "Users can insert own alerts"
    on public.alerts for insert
    with check (auth.uid() = user_id);
create policy "Users can update own alerts"
    on public.alerts for update
    using (auth.uid() = user_id);
create policy "Users can delete own alerts"
    on public.alerts for delete
    using (auth.uid() = user_id);

-- Resumes: user owns their data
create policy "Users can read own resume"
    on public.resumes for select
    using (auth.uid() = user_id);
create policy "Users can insert own resume"
    on public.resumes for insert
    with check (auth.uid() = user_id);
create policy "Users can update own resume"
    on public.resumes for update
    using (auth.uid() = user_id);
create policy "Users can delete own resume"
    on public.resumes for delete
    using (auth.uid() = user_id);

-- Search history: user owns their data
create policy "Users can read own history"
    on public.search_history for select
    using (auth.uid() = user_id);
create policy "Users can insert own history"
    on public.search_history for insert
    with check (auth.uid() = user_id);
create policy "Users can delete own history"
    on public.search_history for delete
    using (auth.uid() = user_id);

-- Quota: user can read own quota
create policy "Users can read own quota"
    on public.user_quota for select
    using (auth.uid() = user_id);
create policy "Service role can manage quota"
    on public.user_quota for insert
    with check (true);
create policy "Service role can update quota"
    on public.user_quota for update
    using (true);

-- 8. Enable pg_trgm for text search (used in jobs.title gin index)
create extension if not exists pg_trgm with schema extensions;
