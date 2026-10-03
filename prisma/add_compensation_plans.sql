-- ==========================================
-- Incremental: agregar tabla y RLS de compensation_plans
-- Correr en Supabase → SQL Editor (tu BD ya tiene el resto de las tablas)
-- ==========================================

create table compensation_plans (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table compensation_plans enable row level security;

create policy "compensation_plans_select" on compensation_plans
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "compensation_plans_upsert" on compensation_plans
  for insert with check (tenant_id in (select auth_tenant_ids()));

create policy "compensation_plans_update" on compensation_plans
  for update using (tenant_id in (select auth_tenant_ids()));
