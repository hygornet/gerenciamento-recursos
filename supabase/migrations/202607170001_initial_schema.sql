create extension if not exists "pgcrypto";

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null,
  role text not null,
  location text not null default 'Remoto',
  status text not null default 'Ativo' check (status in ('Ativo', 'Férias', 'Inativo')),
  weekly_capacity numeric(5, 2) not null default 40 check (weekly_capacity between 0 and 168),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index resources_email_key on public.resources (lower(email));
create index resources_status_idx on public.resources (status);

create table public.resource_skills (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  skill_name text not null,
  level smallint not null check (level between 1 and 5),
  created_at timestamptz not null default now(),
  unique (resource_id, skill_name)
);

create index resource_skills_name_idx on public.resource_skills (lower(skill_name));

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  client text not null,
  type text not null check (type in ('Projeto', 'Serviço gerenciado')),
  status text not null default 'Planejamento' check (status in ('Planejamento', 'Em andamento', 'Em risco', 'Concluído')),
  start_date date not null,
  end_date date not null,
  contracted_hours numeric(10, 2) not null default 0 check (contracted_hours >= 0),
  consumed_hours numeric(10, 2) not null default 0 check (consumed_hours >= 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index engagements_type_status_idx on public.engagements (type, status);

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 168),
  created_at timestamptz not null default now(),
  unique (engagement_id, resource_id)
);

create index allocations_resource_idx on public.allocations (resource_id);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  level text not null check (level in ('Fundamental', 'Associate', 'Expert', 'Specialty')),
  renewal_months smallint not null default 12 check (renewal_months between 0 and 120),
  holders integer not null default 0 check (holders >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index certifications_code_key on public.certifications (upper(code));

create or replace function public.is_portal_leader()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'portal_role' in ('tech_lead', 'admin'), false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger resources_set_updated_at before update on public.resources
for each row execute function public.set_updated_at();

create trigger engagements_set_updated_at before update on public.engagements
for each row execute function public.set_updated_at();

create trigger certifications_set_updated_at before update on public.certifications
for each row execute function public.set_updated_at();

alter table public.resources enable row level security;
alter table public.resource_skills enable row level security;
alter table public.engagements enable row level security;
alter table public.allocations enable row level security;
alter table public.certifications enable row level security;

create policy "leaders_manage_resources" on public.resources for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));
create policy "leaders_manage_resource_skills" on public.resource_skills for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));
create policy "leaders_manage_engagements" on public.engagements for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));
create policy "leaders_manage_allocations" on public.allocations for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));
create policy "leaders_manage_certifications" on public.certifications for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));

-- Skills e alocações são gravadas junto com a entidade principal. Qualquer falha
-- desfaz toda a operação, evitando estados parciais no portal.
create or replace function public.save_resource(
  p_resource_id uuid,
  p_name text,
  p_email text,
  p_role text,
  p_location text,
  p_status text,
  p_weekly_capacity numeric,
  p_skills jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_resource_id uuid;
begin
  if not public.is_portal_leader() then
    raise exception 'portal role required' using errcode = '42501';
  end if;

  if p_resource_id is null then
    insert into public.resources (name, email, role, location, status, weekly_capacity)
    values (p_name, p_email, p_role, p_location, p_status, p_weekly_capacity)
    returning id into v_resource_id;
  else
    update public.resources
    set name = p_name, email = p_email, role = p_role, location = p_location,
        status = p_status, weekly_capacity = p_weekly_capacity
    where id = p_resource_id
    returning id into v_resource_id;

    if v_resource_id is null then
      raise exception 'resource not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.resource_skills where resource_id = v_resource_id;
  insert into public.resource_skills (resource_id, skill_name, level)
  select v_resource_id, trim(skill ->> 'name'), (skill ->> 'level')::smallint
  from jsonb_array_elements(coalesce(p_skills, '[]'::jsonb)) as skill;

  return v_resource_id;
end;
$$;

create or replace function public.save_engagement(
  p_engagement_id uuid,
  p_name text,
  p_client text,
  p_type text,
  p_status text,
  p_start_date date,
  p_end_date date,
  p_contracted_hours numeric,
  p_consumed_hours numeric,
  p_description text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_engagement_id uuid;
begin
  if not public.is_portal_leader() then
    raise exception 'portal role required' using errcode = '42501';
  end if;

  if p_engagement_id is null then
    insert into public.engagements (name, client, type, status, start_date, end_date, contracted_hours, consumed_hours, description)
    values (p_name, p_client, p_type, p_status, p_start_date, p_end_date, p_contracted_hours, p_consumed_hours, p_description)
    returning id into v_engagement_id;
  else
    update public.engagements
    set name = p_name, client = p_client, type = p_type, status = p_status,
        start_date = p_start_date, end_date = p_end_date,
        contracted_hours = p_contracted_hours, consumed_hours = p_consumed_hours,
        description = p_description
    where id = p_engagement_id
    returning id into v_engagement_id;

    if v_engagement_id is null then
      raise exception 'engagement not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.allocations where engagement_id = v_engagement_id;
  insert into public.allocations (engagement_id, resource_id, hours)
  select v_engagement_id, (allocation ->> 'resource_id')::uuid, (allocation ->> 'hours')::numeric
  from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as allocation;

  return v_engagement_id;
end;
$$;

grant select, insert, update, delete on public.resources to authenticated;
grant select, insert, update, delete on public.resource_skills to authenticated;
grant select, insert, update, delete on public.engagements to authenticated;
grant select, insert, update, delete on public.allocations to authenticated;
grant select, insert, update, delete on public.certifications to authenticated;
grant execute on function public.is_portal_leader() to authenticated;

revoke all on function public.save_resource(uuid, text, text, text, text, text, numeric, jsonb) from public;
revoke all on function public.save_engagement(uuid, text, text, text, text, date, date, numeric, numeric, text, jsonb) from public;
grant execute on function public.save_resource(uuid, text, text, text, text, text, numeric, jsonb) to authenticated;
grant execute on function public.save_engagement(uuid, text, text, text, text, date, date, numeric, numeric, text, jsonb) to authenticated;
