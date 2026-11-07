-- ==========================================
-- Incremental: Inicio Rápido, Global, Decembrino, Calificación Sostenida
-- Correr en Supabase → SQL Editor
-- ==========================================

alter table commission_runs add column fast_start_amount decimal(12, 2) not null default 0;
alter table commission_runs add column global_bonus_amount decimal(12, 2) not null default 0;
alter table commission_runs add column qualification_bonus_amount decimal(12, 2) not null default 0;

-- Rachas de calificación sostenida (auto por rango, viaje por rango, o cualquier
-- bono que exija mantener un rango varios periodos seguidos). Una fila por
-- distribuidor por regla configurada en el plan.
create table qualification_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  distributor_id uuid not null references distributors(id) on delete cascade,
  rule_id text not null,
  rule_name text not null,
  consecutive_count integer not null default 0,
  is_qualified boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (tenant_id, distributor_id, rule_id)
);

create index idx_qualification_progress_tenant on qualification_progress(tenant_id, rule_id);

-- Bono decembrino: anual, separado de los periodos semanales de comisión.
create table christmas_bonus_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  year integer not null,
  distributor_id uuid not null references distributors(id) on delete cascade,
  base_volume decimal(12, 2) not null,
  amount decimal(12, 2) not null,
  paid_at timestamptz not null default now(),
  unique (tenant_id, distributor_id, year)
);

create index idx_christmas_bonus_runs_tenant_year on christmas_bonus_runs(tenant_id, year);

alter table qualification_progress enable row level security;
alter table christmas_bonus_runs enable row level security;

create policy "qualification_progress_all" on qualification_progress
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "christmas_bonus_runs_all" on christmas_bonus_runs
  for all using (tenant_id in (select auth_tenant_ids()));
