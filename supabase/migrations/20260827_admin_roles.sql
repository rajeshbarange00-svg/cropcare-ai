-- CropCare AI admin authorization
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Add admin CRUD policies without removing existing public read policies.
do $$
declare
  t text;
begin
  foreach t in array array['crops','crop_stages','diseases','pests','weeds','fertilizers','chemicals','sources','advisories','advisory_targets','advisory_applications']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "admins manage %I" on public.%I', t, t);
      execute format('create policy "admins manage %I" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    end if;
  end loop;
end $$;

-- After creating the first account, promote it manually:
-- update public.profiles set role = 'admin' where id = '<YOUR_AUTH_USER_UUID>';
