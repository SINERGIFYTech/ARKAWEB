-- ==========================================
-- Incremental: Medición de uso (billing por consumo) + Platform Admin
-- Correr en Supabase → SQL Editor (tu BD ya tiene el resto de las tablas)
-- ==========================================

-- Marca qué usuario(s) pueden entrar a /admin y ver TODOS los tenants (tú).
-- IMPORTANTE: users no tenía RLS habilitado — se agrega aquí (hueco de seguridad
-- que no existía antes: sin esto, cualquier usuario autenticado podía leer la
-- tabla completa de usuarios vía la API de Supabase).
alter table users add column if not exists is_platform_admin boolean not null default false;

alter table users enable row level security;

create policy "users_select_own" on users
  for select using (id = auth.uid());

-- Cada interacción crítica que se factura. quantity permite que un solo evento
-- represente varias interacciones (ej. un cierre de periodo que procesó 40 distribuidores).
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_type text not null, -- DISTRIBUTOR_REGISTERED | ORDER_PROCESSED | COMMISSION_RUN | GENEALOGY_QUERY
  quantity integer not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_usage_events_tenant_date on usage_events(tenant_id, created_at);
create index idx_usage_events_type on usage_events(tenant_id, event_type, created_at);

alter table usage_events enable row level security;

-- Cada tenant puede ver su propio consumo (transparencia hacia el cliente).
create policy "usage_events_select_own_tenant" on usage_events
  for select using (tenant_id in (select auth_tenant_ids()));

-- El registro de eventos lo hace la app en nombre del usuario autenticado de ese tenant.
create policy "usage_events_insert_own_tenant" on usage_events
  for insert with check (tenant_id in (select auth_tenant_ids()));

-- NOTA: el panel /admin lee de TODOS los tenants usando el service role key
-- (bypassa RLS a propósito, protegido por el check de is_platform_admin en la
-- app antes de tocar esa ruta) — por eso no hace falta una policy "select all".

-- ==========================================
-- Paso manual único: hazte platform admin
-- Reemplaza el correo por el tuyo y corre esto DESPUÉS de haberte registrado
-- normalmente en /signup:
-- ==========================================
-- update users set is_platform_admin = true where email = 'tu-correo@ejemplo.com';
