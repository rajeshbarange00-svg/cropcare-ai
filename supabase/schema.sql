-- CropCare AI core schema
create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('government','research','api','github','manual')),
  url text,
  license text,
  reliability_score numeric(3,2) default 0.50 check (reliability_score between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  common_name text not null unique,
  scientific_name text,
  category text,
  season text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.crop_stages (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  name text not null,
  stage_order integer not null default 0,
  unique(crop_id,name)
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  issue_type text not null check (issue_type in ('disease','pest','weed','nutrient_deficiency')),
  common_name text not null,
  scientific_name text,
  description text,
  unique(issue_type,common_name)
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  treatment_type text not null check (treatment_type in ('fertilizer','fungicide','insecticide','herbicide','biological','cultural')),
  active_ingredient text,
  product_name text,
  formulation text,
  description text,
  safety_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.advisories (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  crop_stage_id uuid references public.crop_stages(id) on delete set null,
  issue_id uuid references public.issues(id) on delete set null,
  treatment_id uuid not null references public.treatments(id) on delete restrict,
  dose text,
  application_method text,
  waiting_period text,
  state text,
  language_code text default 'hi',
  source_id uuid references public.sources(id) on delete set null,
  validation_status text not null default 'draft' check (validation_status in ('draft','reviewed','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'India',
  state text,
  district text,
  latitude numeric,
  longitude numeric,
  unique(country,state,district)
);

create table if not exists public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  observed_at timestamptz not null,
  temperature_c numeric,
  relative_humidity numeric,
  precipitation_mm numeric,
  soil_moisture numeric,
  raw jsonb,
  source_id uuid references public.sources(id) on delete set null,
  unique(location_id,observed_at)
);

create index if not exists idx_advisories_crop on public.advisories(crop_id);
create index if not exists idx_advisories_issue on public.advisories(issue_id);
create index if not exists idx_advisories_status on public.advisories(validation_status);
create index if not exists idx_issues_type on public.issues(issue_type);

alter table public.sources enable row level security;
alter table public.crops enable row level security;
alter table public.crop_stages enable row level security;
alter table public.issues enable row level security;
alter table public.treatments enable row level security;
alter table public.advisories enable row level security;
alter table public.locations enable row level security;
alter table public.weather_snapshots enable row level security;

-- Public app can read only approved advisory data.
create policy "public read crops" on public.crops for select using (true);
create policy "public read crop stages" on public.crop_stages for select using (true);
create policy "public read issues" on public.issues for select using (true);
create policy "public read treatments" on public.treatments for select using (true);
create policy "public read sources" on public.sources for select using (true);
create policy "public read approved advisories" on public.advisories for select using (validation_status = 'approved');
create policy "public read locations" on public.locations for select using (true);
