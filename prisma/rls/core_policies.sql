-- ==========================================
-- BackOffice Engine — RLS Policies (Core)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de `prisma migrate dev`
-- ==========================================

-- Función helper: tenant_ids a los que pertenece el usuario autenticado
create or replace function auth_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tenant_id from tenant_users where user_id = auth.uid() and status = 'ACTIVE';
$$;

-- Activar RLS en todas las tablas de negocio
alter table tenants enable row level security;
alter table tenant_domains enable row level security;
alter table tenant_users enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table tenant_modules enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table audit_logs enable row level security;
alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table files enable row level security;
alter table subscriptions enable row level security;

-- TENANTS: solo ver/editar el/los tenant(s) al que perteneces
create policy "tenant_select_own" on tenants
  for select using (id in (select auth_tenant_ids()));

create policy "tenant_update_own" on tenants
  for update using (id in (select auth_tenant_ids()));

-- Patrón repetido para el resto de tablas con tenant_id: SELECT/INSERT/UPDATE/DELETE
-- solo si tenant_id está en auth_tenant_ids(). Ejemplo genérico (repetir por tabla):

create policy "tenant_users_select" on tenant_users
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "roles_select" on roles
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "tenant_modules_select" on tenant_modules
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "notifications_select" on notifications
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "notifications_update_own" on notifications
  for update using (tenant_id in (select auth_tenant_ids()) and user_id = auth.uid());

create policy "activity_logs_select" on activity_logs
  for select using (tenant_id in (select auth_tenant_ids()));

-- AUDIT LOG: solo lectura, nunca update/delete (append-only) — no se crean policies de update/delete
create policy "audit_logs_select" on audit_logs
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "audit_logs_insert" on audit_logs
  for insert with check (tenant_id in (select auth_tenant_ids()));

create policy "api_keys_select" on api_keys
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "webhooks_all" on webhooks
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "files_all" on files
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "subscriptions_select" on subscriptions
  for select using (tenant_id in (select auth_tenant_ids()));

-- ==========================================
-- MODULO RankFlow: distributors
-- ==========================================
alter table distributors enable row level security;

create policy "distributors_select" on distributors
  for select using (tenant_id in (select auth_tenant_ids()));

create policy "distributors_insert" on distributors
  for insert with check (tenant_id in (select auth_tenant_ids()));

create policy "distributors_update" on distributors
  for update using (tenant_id in (select auth_tenant_ids()));

-- ==========================================
-- MODULO RankFlow: compensation_plans
-- ==========================================
alter table compensation_plans enable row level security;

create policy "compensation_plans_select" on compensation_plans
  for select using (tenant_id in (select auth_tenant_ids()));
create policy "compensation_plans_upsert" on compensation_plans
  for insert with check (tenant_id in (select auth_tenant_ids()));
create policy "compensation_plans_update" on compensation_plans
  for update using (tenant_id in (select auth_tenant_ids()));

-- NOTA: los INSERT iniciales de tenant/roles/tenant_users al registrarse los hace
-- app/api/tenant/create/route.ts con el SERVICE ROLE KEY (bypassa RLS a propósito,
-- porque en ese momento el usuario aún no tiene membresía = auth_tenant_ids() vacío).
-- Los distribuidores, en cambio, se crean con el usuario ya autenticado y con
-- membresía activa, así que pasan por RLS normalmente (app/api/rankflow/distributors/route.ts).
