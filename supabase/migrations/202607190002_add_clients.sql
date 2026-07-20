create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  document text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  status text not null default 'Ativo' check (status in ('Ativo', 'Inativo')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index clients_name_key on public.clients (lower(name));
create index clients_status_idx on public.clients (status);

create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
create policy "leaders_manage_clients" on public.clients for all to authenticated
using ((select public.is_portal_leader())) with check ((select public.is_portal_leader()));

grant select, insert, update, delete on public.clients to authenticated;

-- Converte os nomes livres já existentes em registros de cliente sem perder dados.
insert into public.clients (name)
select min(normalized_name)
from (
  select case when char_length(trim(client)) >= 2 then trim(client) else 'Cliente não informado' end as normalized_name
  from public.engagements
) source_clients
group by lower(normalized_name)
on conflict do nothing;

alter table public.engagements
add column client_id uuid references public.clients(id) on delete restrict;

update public.engagements engagement
set client_id = client.id,
    client = client.name
from public.clients client
where lower(client.name) = lower(case when char_length(trim(engagement.client)) >= 2 then trim(engagement.client) else 'Cliente não informado' end);

alter table public.engagements alter column client_id set not null;
create index engagements_client_idx on public.engagements (client_id);

create or replace function public.sync_client_name_to_engagements()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.name is distinct from old.name then
    update public.engagements set client = new.name where client_id = new.id;
  end if;
  return new;
end;
$$;

create trigger clients_sync_engagement_name
after update of name on public.clients
for each row execute function public.sync_client_name_to_engagements();

drop function if exists public.save_engagement(uuid, text, text, text, text, date, date, numeric, numeric, text, jsonb);

create function public.save_engagement(
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
    insert into public.engagements (client_id, name, client, type, status, start_date, end_date, contracted_hours, consumed_hours, description)
    values (p_client_id, p_name, v_client_name, p_type, p_status, p_start_date, p_end_date, p_contracted_hours, p_consumed_hours, p_description)
    returning id into v_engagement_id;
  else
    update public.engagements
    set client_id = p_client_id, name = p_name, client = v_client_name, type = p_type, status = p_status,
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

revoke all on function public.save_engagement(uuid, uuid, text, text, text, text, date, date, numeric, numeric, text, jsonb) from public;
grant execute on function public.save_engagement(uuid, uuid, text, text, text, text, date, date, numeric, numeric, text, jsonb) to authenticated;
