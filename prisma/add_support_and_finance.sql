-- ==========================================
-- Incremental: Support (tickets) + Finance (facturas) reales
-- Correr en Supabase → SQL Editor
-- ==========================================

create type ticket_status as enum ('OPEN', 'IN_PROGRESS', 'CLOSED');
create type ticket_priority as enum ('LOW', 'MEDIUM', 'HIGH');
create type invoice_status as enum ('PENDING', 'PAID', 'OVERDUE');

create table tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject text not null,
  description text,
  status ticket_status not null default 'OPEN',
  priority ticket_priority not null default 'MEDIUM',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_tenant_status on tickets(tenant_id, status);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_ticket_messages_ticket on ticket_messages(tenant_id, ticket_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_name text not null,
  amount decimal(12, 2) not null,
  status invoice_status not null default 'PENDING',
  due_date date not null,
  created_at timestamptz not null default now()
);

create index idx_invoices_tenant_status on invoices(tenant_id, status);

-- ---------- RLS ----------
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table invoices enable row level security;

create policy "tickets_all" on tickets
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "ticket_messages_all" on ticket_messages
  for all using (tenant_id in (select auth_tenant_ids()));

create policy "invoices_all" on invoices
  for all using (tenant_id in (select auth_tenant_ids()));
