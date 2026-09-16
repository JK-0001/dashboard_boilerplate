-- Audit log: generic DB trigger + append-only table.
-- REFERENCE MIGRATION — run against your Supabase project when you wire a
-- real backend. Covering a new table = adding one name to the array below.
-- Production lessons baked in: no-op updates are skipped, and heartbeat
-- columns (updated_at etc.) are ignored so background writes don't drown
-- the log. RLS grants SELECT + INSERT only — append-only at the database.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  user_id uuid references auth.users (id),
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;

-- Append-only: select + insert, deliberately NO update/delete policies.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated using (true);
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log
  for insert to authenticated with check (true);

-- Generic trigger: one function serves every audited table.
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id  text;
begin
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new := case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) end;

  -- Ignore heartbeat columns, then skip no-op updates entirely.
  if tg_op = 'UPDATE' then
    v_old := v_old - 'updated_at' - 'created_at' - 'last_seen_at';
    v_new := v_new - 'updated_at' - 'created_at' - 'last_seen_at';
    if v_old = v_new then
      return new;
    end if;
  end if;

  v_id := coalesce(v_new ->> 'id', v_old ->> 'id');

  insert into public.audit_log (user_id, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, v_id, v_old, v_new);

  return coalesce(new, old);
exception when others then
  -- Logging must never break the user's write.
  return coalesce(new, old);
end;
$$;

-- Attach to every audited table — extend this array per project.
do $$
declare
  t text;
begin
  foreach t in array array['products'] loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I
       for each row execute function public.fn_audit_log()',
      t, t
    );
  end loop;
end;
$$;
