-- Extende o portal para representar integralmente a planilha de Power Platform
-- e manter um histórico operacional por projeto/serviço gerenciado.

alter table public.resources
  add column if not exists experience_years numeric(4, 1),
  add column if not exists capacity_status text not null default '',
  add column if not exists certifications text not null default '',
  add column if not exists growth_goal text not null default '';

alter table public.resources
  drop constraint if exists resources_experience_years_check;
alter table public.resources
  add constraint resources_experience_years_check
  check (experience_years is null or experience_years between 0 and 80);

alter table public.resources alter column email set default '';
drop index if exists public.resources_email_key;
create unique index resources_email_key
  on public.resources (lower(email))
  where trim(email) <> '';

alter table public.resource_skills
  add column if not exists proficiency text not null default '';
alter table public.resource_skills
  drop constraint if exists resource_skills_level_check;
alter table public.resource_skills
  add constraint resource_skills_level_check check (level between 0 and 5);

alter table public.engagements
  add column if not exists required_skills text not null default '',
  add column if not exists current_status text not null default '',
  add column if not exists health text not null default 'OK',
  add column if not exists consultant_snapshot text not null default '';

alter table public.engagements
  drop constraint if exists engagements_health_check;
alter table public.engagements
  add constraint engagements_health_check check (health in ('OK', 'Ponto de atenção', 'Crítico'));

alter table public.engagements alter column start_date drop not null;
alter table public.engagements alter column end_date drop not null;

alter table public.allocations
  add column if not exists role text not null default '',
  add column if not exists allocation_percentage numeric(7, 4),
  add column if not exists source_status text not null default '',
  add column if not exists offer_type text not null default '';
alter table public.allocations
  drop constraint if exists allocations_hours_check;
alter table public.allocations
  add constraint allocations_hours_check check (hours between 0 and 168);

alter table public.allocations
  drop constraint if exists allocations_percentage_check;
alter table public.allocations
  add constraint allocations_percentage_check
  check (allocation_percentage is null or allocation_percentage between 0 and 10);

create table if not exists public.engagement_updates (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  occurred_on date not null default current_date,
  category text not null default 'Atualização'
    check (category in ('Atualização', 'Ponto de atenção', 'Gap', 'Risco', 'Decisão', 'Próximo passo')),
  status text not null default 'Aberto'
    check (status in ('Aberto', 'Em acompanhamento', 'Resolvido')),
  note text not null check (char_length(trim(note)) between 2 and 5000),
  author text not null default '' check (char_length(author) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists engagement_updates_engagement_date_idx
  on public.engagement_updates (engagement_id, occurred_on desc, created_at desc);

drop trigger if exists engagement_updates_set_updated_at on public.engagement_updates;
create trigger engagement_updates_set_updated_at before update on public.engagement_updates
for each row execute function public.set_updated_at();

alter table public.engagement_updates enable row level security;
drop policy if exists "leaders_manage_engagement_updates" on public.engagement_updates;
create policy "leaders_manage_engagement_updates" on public.engagement_updates for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));

grant select, insert, update, delete on public.engagement_updates to authenticated;

create or replace function public.save_resource(
  p_resource_id uuid,
  p_name text,
  p_email text,
  p_role text,
  p_location text,
  p_status text,
  p_weekly_capacity numeric,
  p_experience_years numeric,
  p_capacity_status text,
  p_certifications text,
  p_growth_goal text,
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
    insert into public.resources (
      name, email, role, location, status, weekly_capacity, experience_years,
      capacity_status, certifications, growth_goal
    )
    values (
      trim(p_name), trim(coalesce(p_email, '')), trim(p_role), trim(p_location),
      p_status, p_weekly_capacity, p_experience_years, trim(coalesce(p_capacity_status, '')),
      coalesce(p_certifications, ''), coalesce(p_growth_goal, '')
    )
    returning id into v_resource_id;
  else
    update public.resources
    set name = trim(p_name),
        email = trim(coalesce(p_email, '')),
        role = trim(p_role),
        location = trim(p_location),
        status = p_status,
        weekly_capacity = p_weekly_capacity,
        experience_years = p_experience_years,
        capacity_status = trim(coalesce(p_capacity_status, '')),
        certifications = coalesce(p_certifications, ''),
        growth_goal = coalesce(p_growth_goal, '')
    where id = p_resource_id
    returning id into v_resource_id;

    if v_resource_id is null then
      raise exception 'resource not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.resource_skills where resource_id = v_resource_id;
  insert into public.resource_skills (resource_id, skill_name, level, proficiency)
  select
    v_resource_id,
    trim(skill ->> 'name'),
    coalesce((skill ->> 'level')::smallint, 0),
    trim(coalesce(skill ->> 'proficiency', ''))
  from jsonb_array_elements(coalesce(p_skills, '[]'::jsonb)) as skill
  where trim(coalesce(skill ->> 'name', '')) <> '';

  return v_resource_id;
end;
$$;

create or replace function public.save_engagement(
  p_engagement_id uuid,
  p_client_id uuid,
  p_name text,
  p_client text,
  p_type text,
  p_status text,
  p_start_date date,
  p_end_date date,
  p_contracted_hours numeric,
  p_consumed_hours numeric,
  p_description text,
  p_required_skills text,
  p_current_status text,
  p_health text,
  p_consultant_snapshot text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_engagement_id uuid;
  v_client_name text;
begin
  if not public.is_portal_leader() then
    raise exception 'portal role required' using errcode = '42501';
  end if;

  select name into v_client_name from public.clients where id = p_client_id;
  if v_client_name is null then
    raise exception 'client not found' using errcode = 'P0002';
  end if;

  if p_engagement_id is null then
    insert into public.engagements (
      client_id, name, client, type, status, start_date, end_date,
      contracted_hours, consumed_hours, description, required_skills,
      current_status, health, consultant_snapshot
    )
    values (
      p_client_id, trim(p_name), v_client_name, p_type, p_status, p_start_date, p_end_date,
      p_contracted_hours, p_consumed_hours, coalesce(p_description, ''),
      coalesce(p_required_skills, ''), coalesce(p_current_status, ''),
      p_health, coalesce(p_consultant_snapshot, '')
    )
    returning id into v_engagement_id;
  else
    update public.engagements
    set client_id = p_client_id,
        name = trim(p_name),
        client = v_client_name,
        type = p_type,
        status = p_status,
        start_date = p_start_date,
        end_date = p_end_date,
        contracted_hours = p_contracted_hours,
        consumed_hours = p_consumed_hours,
        description = coalesce(p_description, ''),
        required_skills = coalesce(p_required_skills, ''),
        current_status = coalesce(p_current_status, ''),
        health = p_health,
        consultant_snapshot = coalesce(p_consultant_snapshot, '')
    where id = p_engagement_id
    returning id into v_engagement_id;

    if v_engagement_id is null then
      raise exception 'engagement not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.allocations where engagement_id = v_engagement_id;
  insert into public.allocations (engagement_id, resource_id, hours, role, allocation_percentage, source_status, offer_type)
  select
    v_engagement_id,
    (allocation ->> 'resource_id')::uuid,
    (allocation ->> 'hours')::numeric,
    trim(coalesce(allocation ->> 'role', '')),
    nullif(allocation ->> 'allocation_percentage', '')::numeric,
    trim(coalesce(allocation ->> 'source_status', '')),
    trim(coalesce(allocation ->> 'offer_type', ''))
  from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as allocation;

  return v_engagement_id;
end;
$$;

revoke all on function public.save_resource(
  uuid, text, text, text, text, text, numeric, numeric, text, text, text, jsonb
) from public;
grant execute on function public.save_resource(
  uuid, text, text, text, text, text, numeric, numeric, text, text, text, jsonb
) to authenticated;

revoke all on function public.save_engagement(
  uuid, uuid, text, text, text, text, date, date, numeric, numeric, text, text, text, text, text, jsonb
) from public;
grant execute on function public.save_engagement(
  uuid, uuid, text, text, text, text, date, date, numeric, numeric, text, text, text, text, text, jsonb
) to authenticated;