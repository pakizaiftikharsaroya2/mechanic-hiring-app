-- =====================================================================
-- AutoRescue Pakistan — Supabase schema
-- Run this once, top to bottom, in the Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('CLIENT', 'MECHANIC', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mechanic_status as enum ('ONLINE', 'OFFLINE', 'BUSY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum (
    'PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED',
    'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  role        user_role not null default 'CLIENT',
  avatar      text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- Role and name come from the metadata passed at sign-up
-- (supabase.auth.signUp({ options: { data: { name, role } } })).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'CLIENT')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. mechanic_profiles  (1:1 with profiles, only for role = MECHANIC)
-- ---------------------------------------------------------------------
create table if not exists public.mechanic_profiles (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  specialty    text,
  rating       numeric(2,1) not null default 5.0,
  total_jobs   integer not null default 0,
  status       mechanic_status not null default 'OFFLINE',
  latitude     double precision,
  longitude    double precision,
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_mechanic_profiles_status
  on public.mechanic_profiles(status);

-- ---------------------------------------------------------------------
-- 4. service_requests
-- ---------------------------------------------------------------------
create table if not exists public.service_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  mechanic_id     uuid references public.profiles(id) on delete set null,

  vehicle_make    text not null,
  vehicle_model   text not null,
  vehicle_color   text,
  breakdown_type  text not null,
  service_type    text not null,
  description     text,

  latitude        double precision not null,
  longitude       double precision not null,
  location_text   text,

  budget          numeric(10,2),
  payment_method  text,

  status          request_status not null default 'PENDING',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_requests_status        on public.service_requests(status);
create index if not exists idx_requests_client_id      on public.service_requests(client_id);
create index if not exists idx_requests_mechanic_id    on public.service_requests(mechanic_id);
create index if not exists idx_requests_created_at     on public.service_requests(created_at desc);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_requests_touch on public.service_requests;
create trigger trg_requests_touch
  before update on public.service_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4a. Enforce the status state machine at the database level
--     PENDING -> ACCEPTED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED
--     PENDING/ACCEPTED/EN_ROUTE -> CANCELLED is also allowed.
-- ---------------------------------------------------------------------
create or replace function public.validate_status_transition()
returns trigger language plpgsql as $$
declare
  allowed boolean := false;
begin
  if old.status = new.status then
    return new; -- no-op update (e.g. touching other columns) is fine
  end if;

  allowed := case old.status
    when 'PENDING'     then new.status in ('ACCEPTED', 'CANCELLED')
    when 'ACCEPTED'    then new.status in ('EN_ROUTE', 'CANCELLED')
    when 'EN_ROUTE'    then new.status in ('ARRIVED', 'CANCELLED')
    when 'ARRIVED'     then new.status in ('IN_PROGRESS', 'CANCELLED')
    when 'IN_PROGRESS' then new.status in ('COMPLETED', 'CANCELLED')
    else false
  end;

  if not allowed then
    raise exception 'Invalid status transition: % -> %', old.status, new.status;
  end if;

  if new.status = 'COMPLETED' then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_requests_status_transition on public.service_requests;
create trigger trg_requests_status_transition
  before update of status on public.service_requests
  for each row execute function public.validate_status_transition();

-- ---------------------------------------------------------------------
-- 5. messages
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.service_requests(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists idx_messages_request_id on public.messages(request_id, created_at);

-- ---------------------------------------------------------------------
-- 6. mechanic_locations  (append-only location ping log)
-- ---------------------------------------------------------------------
create table if not exists public.mechanic_locations (
  id           uuid primary key default gen_random_uuid(),
  mechanic_id  uuid not null references public.profiles(id) on delete cascade,
  request_id   uuid references public.service_requests(id) on delete cascade,
  latitude     double precision not null,
  longitude    double precision not null,
  "timestamp"  timestamptz not null default now()
);

create index if not exists idx_mech_locations_mechanic_id on public.mechanic_locations(mechanic_id, "timestamp" desc);
create index if not exists idx_mech_locations_request_id  on public.mechanic_locations(request_id, "timestamp" desc);

-- =====================================================================
-- 7. Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.mechanic_profiles   enable row level security;
alter table public.service_requests    enable row level security;
alter table public.messages            enable row level security;
alter table public.mechanic_locations  enable row level security;

-- ---- profiles ----
create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- mechanic_profiles ----
create policy "mechanic profiles are readable by any authenticated user"
  on public.mechanic_profiles for select
  using (auth.role() = 'authenticated');

create policy "a mechanic can insert their own mechanic profile"
  on public.mechanic_profiles for insert
  with check (auth.uid() = user_id);

create policy "a mechanic can update only their own mechanic profile"
  on public.mechanic_profiles for update
  using (auth.uid() = user_id);

-- ---- service_requests ----
create policy "clients can view their own requests"
  on public.service_requests for select
  using (auth.uid() = client_id);

create policy "assigned mechanic can view the request"
  on public.service_requests for select
  using (auth.uid() = mechanic_id);

create policy "any online mechanic can view pending requests"
  on public.service_requests for select
  using (
    status = 'PENDING'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'MECHANIC'
    )
  );

create policy "clients can create their own requests"
  on public.service_requests for insert
  with check (auth.uid() = client_id);

create policy "clients can cancel their own pending requests"
  on public.service_requests for update
  using (auth.uid() = client_id);

create policy "assigned mechanic can update their accepted request"
  on public.service_requests for update
  using (auth.uid() = mechanic_id);

-- Note: the "accept" transition (mechanic_id: null -> me, status: PENDING -> ACCEPTED)
-- is done through the /api/requests/[id]/accept serverless route using the
-- service-role key, so it can be done atomically and isn't exposed as a
-- direct RLS-governed update from the frontend.

-- ---- messages ----
create policy "participants can read messages on their request"
  on public.messages for select
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = messages.request_id
        and (r.client_id = auth.uid() or r.mechanic_id = auth.uid())
    )
  );

create policy "participants can send messages on their request"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.service_requests r
      where r.id = messages.request_id
        and (r.client_id = auth.uid() or r.mechanic_id = auth.uid())
    )
  );

-- ---- mechanic_locations ----
create policy "a mechanic can insert their own location pings"
  on public.mechanic_locations for insert
  with check (auth.uid() = mechanic_id);

create policy "a mechanic can read their own location history"
  on public.mechanic_locations for select
  using (auth.uid() = mechanic_id);

create policy "client can read mechanic locations for their own request"
  on public.mechanic_locations for select
  using (
    request_id is not null
    and exists (
      select 1 from public.service_requests r
      where r.id = mechanic_locations.request_id
        and r.client_id = auth.uid()
    )
  );

-- =====================================================================
-- 8. Realtime — expose the tables clients need to subscribe to
-- =====================================================================
alter publication supabase_realtime add table public.service_requests;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.mechanic_locations;

-- ---------------------------------------------------------------------
-- 9. Helper RPC — called from api/requests/[id]/status.js when a job
--    is marked COMPLETED, to bump the mechanic's total_jobs counter.
-- ---------------------------------------------------------------------
create or replace function public.increment_mechanic_jobs(p_mechanic_id uuid)
returns void language sql as $$
  update public.mechanic_profiles set total_jobs = total_jobs + 1 where user_id = p_mechanic_id;
$$;

-- =====================================================================
-- Done. Next: Authentication → Providers → Email, and turn off
-- "Confirm email" for the demo if you don't want to wire up email delivery.
-- =====================================================================
