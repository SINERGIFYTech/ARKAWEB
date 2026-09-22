-- ==========================================
-- BackOffice Engine — Setup completo (Core + RankFlow)
-- Pegar TODO este archivo en Supabase → SQL Editor → New query → Run
-- Es equivalente a `prisma migrate dev`, pero sin necesitar terminal local.
-- ==========================================

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type tenant_status as enum ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');
create type tenant_user_status as enum ('ACTIVE', 'INVITED', 'SUSPENDED');
create type placement_leg as enum ('LEFT', 'RIGHT');
create type distributor_status as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- ---------- TENANT / ORGANIZACION ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text,
  plan_id text,
  status tenant_status not null default 'ACTIVE',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  domain text unique not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- USUARIOS / RBAC ----------
create table users (
  id uuid primary key, -- = auth.users.id de Supabase
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id),
  status tenant_user_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  module_key text not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------- MODULOS ----------
create table modules (
  key text primary key,
  name text not null,
  description text,
  is_core boolean not null default false
);

create table tenant_modules (
  tenant_id uuid not null references tenants(id) on delete cascade,
  module_key text not null references modules(key),
  is_enabled boolean not null default true,
  settings jsonb not null default '{}',
  enabled_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

-- ---------- BILLING DEL SAAS ----------
create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null,
  interval text not null,
  features jsonb not null default '[]'
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique not null references tenants(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICACIONES / LOGS / AUDITORIA ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------- API / INTEGRACIONES ----------
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  hashed_key text unique not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ARCHIVOS ----------
create table files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  bucket_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

-- ==========================================
-- MODULO: RankFlow (Network Marketing)
-- ==========================================
create table distributors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  code text not null,
  full_name text not null,
  sponsor_id uuid references distributors(id),
  placement_parent_id uuid references distributors(id),
  placement_leg placement_leg,
  rank text not null default 'Distribuidor',
  status distributor_status not null default 'ACTIVE',
  personal_volume decimal(12, 2) not null default 0,
  joined_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_distributors_sponsor on distributors(tenant_id, sponsor_id);
create index idx_distributors_placement on distributors(tenant_id, placement_parent_id);

-- Configuración del plan de compensación — editable por tenant desde /dashboard/rankflow/settings
create table compensation_plans (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

-- ==========================================
-- CATALOGO DE MODULOS (seed) — necesario para que tenant_modules funcione
-- ==========================================
insert into modules (key, name, is_core) values
  ('core', 'Dashboard', true),
  ('rankflow', 'RankFlow', false),
  ('crm', 'CRM', false),
  ('projects', 'Proyectos', false),
  ('finance', 'Finanzas', false),
  ('hr', 'HR', false),
  ('inventory', 'Inventario', false),
  ('support', 'Soporte', false),
  ('automations', 'Automatizaciones', false),
  ('ai', 'Asistente IA', false),
  ('analytics', 'Analítica', false);
