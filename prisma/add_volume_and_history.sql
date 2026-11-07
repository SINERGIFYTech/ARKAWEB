-- ==========================================
-- Incremental: Captura de volumen + Historial de cortes de comisión
-- Correr en Supabase → SQL Editor (tu BD ya tiene el resto de las tablas)
-- ==========================================

-- Cada periodo es un corte (normalmente semanal). El volumen se captura
-- contra el periodo abierto; al cerrarlo se congela una foto en commission_runs.
create table commission_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'OPEN', -- OPEN | CLOSED
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_commission_periods_tenant_status on commission_periods(tenant_id, status);

-- Cada venta/volumen que se le captura a un distribuidor, contra un periodo.
-- El volumen personal de un distribuidor en un periodo = suma de sus entries.
create table volume_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  distributor_id uuid not null references distributors(id) on delete cascade,
  period_id uuid not null references commission_periods(id) on delete cascade,
  amount decimal(12, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_volume_entries_period on volume_entries(tenant_id, period_id);
create index idx_volume_entries_distributor on volume_entries(tenant_id, distributor_id);

-- Foto congelada de lo que le tocó a cada distribuidor cuando se cerró un periodo.
-- Esto es el "historial de cortes" — nunca se recalcula, es el registro de lo que se pagó.
create table commission_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period_id uuid not null references commission_periods(id) on delete cascade,
  distributor_id uuid not null references distributors(id) on delete cascade,
  rank text not null,
  binary_amount decimal(12, 2) not null default 0,
  unilevel_amount decimal(12, 2) not null default 0,
  generation_amount decimal(12, 2) not null default 0,
  total_amount decimal(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (period_id, distributor_id)
);

create index idx_commission_runs_period on commission_runs(tenant_id, period_id);
create index idx_commission_runs_distributor on commission_runs(tenant_id, distributor_id);

-- ---------- RLS ----------
alter table commission_periods enable row level security;
alter table volume_entries enable row level security;
alter table commission_runs enable row level security;

create policy "commission_periods_select" on commission_periods
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "commission_periods_insert" on commission_periods
  for insert with check (tenant_id in (select auth_tenant_ids()));
create policy "commission_periods_update" on commission_periods
  for update using (tenant_id in (select auth_tenant_ids()));

create policy "volume_entries_select" on volume_entries
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "volume_entries_insert" on volume_entries
  for insert with check (tenant_id in (select auth_tenant_ids()));

create policy "commission_runs_select" on commission_runs
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "commission_runs_insert" on commission_runs
  for insert with check (tenant_id in (select auth_tenant_ids()));
