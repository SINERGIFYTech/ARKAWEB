-- ==========================================
-- Incremental: Automations (reglas configurables + historial)
-- Correr en Supabase → SQL Editor
-- ==========================================

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  trigger_type text not null, -- distributor.created | ticket.created | rank.changed | period.closed
  is_enabled boolean not null default true,
  conditions jsonb not null default '[]', -- [{ field, operator, value }]
  actions jsonb not null default '[]',    -- [{ type, config }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_automation_rules_tenant_trigger on automation_rules(tenant_id, trigger_type, is_enabled);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  rule_id uuid references automation_rules(id) on delete set null,
  rule_name text not null,
  trigger_type text not null,
  status text not null, -- SUCCESS | ERROR | SKIPPED
  detail text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_automation_runs_tenant_date on automation_runs(tenant_id, created_at);

alter table automation_rules enable row level security;
alter table automation_runs enable row level security;

create policy "automation_rules_all" on automation_rules
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "automation_runs_select" on automation_runs
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "automation_runs_insert" on automation_runs
  for insert with check (tenant_id in (select auth_tenant_ids()));
