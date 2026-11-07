-- ==========================================
-- Incremental: Bono de rango + Matching + respaldo de módulos
-- Correr en Supabase → SQL Editor
-- ==========================================

-- 1. El sidebar ahora lee tenant_modules (antes estaba fijo en código). Los
--    tenants creados antes de que existiera Automations no tienen fila para ese
--    módulo: se les enciende para que no desaparezca al conectar el toggle real.
insert into tenant_modules (tenant_id, module_key, is_enabled)
select t.id, 'automations', true from tenants t
on conflict (tenant_id, module_key) do nothing;

-- 2. El historial de cortes guarda también estos dos componentes.
alter table commission_runs add column rank_bonus_amount decimal(12, 2) not null default 0;
alter table commission_runs add column matching_bonus_amount decimal(12, 2) not null default 0;

-- 3. Bonos de bienvenida (modo ONE_TIME) ya pagados: un distribuidor solo
--    cobra el bono de un rango una vez en su vida.
create table rank_bonus_payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  distributor_id uuid not null references distributors(id) on delete cascade,
  rank text not null,
  period_id uuid references commission_periods(id) on delete set null,
  amount decimal(12, 2) not null,
  paid_at timestamptz not null default now(),
  unique (tenant_id, distributor_id, rank)
);

create index idx_rank_bonus_payouts_tenant on rank_bonus_payouts(tenant_id);

alter table rank_bonus_payouts enable row level security;

create policy "rank_bonus_payouts_select" on rank_bonus_payouts
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "rank_bonus_payouts_insert" on rank_bonus_payouts
  for insert with check (tenant_id in (select auth_tenant_ids()));
