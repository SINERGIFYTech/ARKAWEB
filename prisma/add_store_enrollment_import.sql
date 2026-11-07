-- ==========================================
-- Incremental: Tienda (productos con CV), Pedidos, Inscripciones por link,
-- e Importación atómica de la red.
-- Correr en Supabase → SQL Editor (después de las migraciones anteriores).
-- ==========================================

create type order_status as enum ('PENDING', 'PAID', 'CANCELLED');
create type order_source as enum ('ADMIN', 'PORTAL', 'ENROLLMENT');

-- ---------- PRODUCTOS / PAQUETES ----------
-- cv = valor comisionable. De aquí salen TODOS los porcentajes de comisión:
-- un pedido pagado genera volumen = cantidad × CV.
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  price decimal(12, 2) not null check (price >= 0),
  cv decimal(12, 2) not null default 0 check (cv >= 0),
  is_enrollment_package boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, sku)
);
create index idx_products_tenant on products(tenant_id, is_active);

-- ---------- PEDIDOS ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  number integer not null default 0,
  distributor_id uuid not null references distributors(id) on delete cascade,
  status order_status not null default 'PENDING',
  source order_source not null default 'ADMIN',
  total_price decimal(12, 2) not null default 0,
  total_cv decimal(12, 2) not null default 0,
  payment_method text,
  note text,
  period_id uuid references commission_periods(id) on delete set null,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index idx_orders_tenant_status on orders(tenant_id, status, created_at);
create index idx_orders_distributor on orders(tenant_id, distributor_id);

-- Número de pedido consecutivo POR organización (no global, para no revelar
-- el volumen total de la plataforma a cada cliente).
create or replace function set_order_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('order_number:' || new.tenant_id::text));
  select coalesce(max(number), 0) + 1 into new.number from orders where tenant_id = new.tenant_id;
  return new;
end $$;

create trigger trg_orders_number before insert on orders
  for each row execute function set_order_number();

-- Foto del precio y CV al momento de comprar: cambiar el CV de un producto
-- después NO altera pedidos ni comisiones ya generadas.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  sku text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price decimal(12, 2) not null,
  unit_cv decimal(12, 2) not null
);
create index idx_order_items_order on order_items(order_id);

-- El volumen que viene de un pedido queda ligado a él.
alter table volume_entries add column order_id uuid references orders(id) on delete set null;

-- ---------- INSCRIPCIONES (link de registro) ----------
create table pending_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sponsor_id uuid not null references distributors(id) on delete cascade,
  leg placement_leg,
  full_name text not null,
  email text not null,
  phone text,
  product_id uuid not null references products(id),
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'CANCELLED')),
  distributor_id uuid references distributors(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index idx_pending_enrollments_tenant on pending_enrollments(tenant_id, status, created_at);
create unique index uq_pending_enrollment_email on pending_enrollments (tenant_id, lower(email)) where status = 'PENDING';

-- ---------- UNA POSICIÓN DEL BINARIO = UNA PERSONA ----------
-- Protege contra dos inscripciones simultáneas en la misma posición. Si ya
-- hubiera posiciones duplicadas en tus datos, no se crea y avisa.
do $$
begin
  if exists (
    select 1 from distributors where placement_parent_id is not null and placement_leg is not null
    group by tenant_id, placement_parent_id, placement_leg having count(*) > 1
  ) then
    raise notice 'Hay posiciones duplicadas en el binario: corrígelas y vuelve a correr este bloque para crear el índice único.';
  else
    create unique index if not exists uq_distributors_placement_slot
      on distributors (tenant_id, placement_parent_id, placement_leg)
      where placement_parent_id is not null and placement_leg is not null;
  end if;
end $$;

-- ---------- RLS ----------
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table pending_enrollments enable row level security;

create policy "products_all" on products for all using (tenant_id in (select auth_tenant_ids()));
create policy "orders_all" on orders for all using (tenant_id in (select auth_tenant_ids()));
create policy "order_items_all" on order_items for all using (tenant_id in (select auth_tenant_ids()));
create policy "pending_enrollments_all" on pending_enrollments for all using (tenant_id in (select auth_tenant_ids()));

-- ---------- FUNCIONES (una transacción cada una) ----------

-- Marca un pedido como pagado y genera el volumen = total de CV, todo o nada.
create or replace function mark_order_paid(p_order_id uuid, p_period_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.tenant_id not in (select auth_tenant_ids()) then raise exception 'No autorizado'; end if;
  if v_order.status <> 'PENDING' then raise exception 'El pedido ya está %', v_order.status; end if;
  if not exists (
    select 1 from commission_periods where id = p_period_id and tenant_id = v_order.tenant_id and status = 'OPEN'
  ) then
    raise exception 'El periodo no existe o ya está cerrado';
  end if;

  update orders set status = 'PAID', paid_at = now(), period_id = p_period_id where id = p_order_id;

  if v_order.total_cv > 0 then
    insert into volume_entries (tenant_id, distributor_id, period_id, amount, note, order_id)
    values (v_order.tenant_id, v_order.distributor_id, p_period_id, v_order.total_cv, 'Pedido #' || v_order.number, p_order_id);
  end if;
end $$;

-- Confirma el pago de una inscripción: crea al distribuidor (ya colocado),
-- su pedido de paquete, el volumen (CV del paquete) y cierra la inscripción.
create or replace function confirm_enrollment(
  p_enrollment_id uuid, p_period_id uuid, p_code text,
  p_placement_parent_id uuid, p_placement_leg placement_leg
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e pending_enrollments%rowtype;
  prod products%rowtype;
  v_dist_id uuid;
  v_order_id uuid;
begin
  select * into e from pending_enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'Inscripción no encontrada'; end if;
  if e.tenant_id not in (select auth_tenant_ids()) then raise exception 'No autorizado'; end if;
  if e.status <> 'PENDING' then raise exception 'La inscripción ya está %', e.status; end if;

  select * into prod from products where id = e.product_id and tenant_id = e.tenant_id;
  if not found then raise exception 'Paquete no encontrado'; end if;

  insert into distributors (tenant_id, code, full_name, email, sponsor_id, placement_parent_id, placement_leg)
  values (e.tenant_id, p_code, e.full_name, e.email, e.sponsor_id, p_placement_parent_id, p_placement_leg)
  returning id into v_dist_id;

  insert into orders (tenant_id, distributor_id, status, source, total_price, total_cv, payment_method)
  values (e.tenant_id, v_dist_id, 'PENDING', 'ENROLLMENT', prod.price, prod.cv, 'Inscripción')
  returning id into v_order_id;

  insert into order_items (tenant_id, order_id, product_id, sku, name, quantity, unit_price, unit_cv)
  values (e.tenant_id, v_order_id, prod.id, prod.sku, prod.name, 1, prod.price, prod.cv);

  perform mark_order_paid(v_order_id, p_period_id);

  update pending_enrollments
    set status = 'PAID', distributor_id = v_dist_id, order_id = v_order_id, confirmed_at = now()
    where id = e.id;

  return jsonb_build_object('distributor_id', v_dist_id, 'order_id', v_order_id);
end $$;

-- Importación de la red completa en UNA sola sentencia: o entra todo o no entra
-- nada. Los ids ya vienen resueltos (patrocinador y colocación apuntan a ids
-- de este mismo lote o de distribuidores existentes), por eso el orden de las
-- filas no importa.
create or replace function import_distributors(p_tenant uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if p_tenant not in (select auth_tenant_ids()) then raise exception 'No autorizado'; end if;

  insert into distributors (
    id, tenant_id, code, full_name, email, sponsor_id,
    placement_parent_id, placement_leg, rank, status, joined_at
  )
  select
    (r->>'id')::uuid, p_tenant, r->>'code', r->>'full_name', nullif(r->>'email', ''),
    nullif(r->>'sponsor_id', '')::uuid,
    nullif(r->>'placement_parent_id', '')::uuid,
    nullif(r->>'placement_leg', '')::placement_leg,
    coalesce(nullif(r->>'rank', ''), 'Distribuidor'),
    coalesce(nullif(r->>'status', ''), 'ACTIVE')::distributor_status,
    coalesce(nullif(r->>'joined_at', '')::timestamptz, now())
  from jsonb_array_elements(p_rows) r;

  get diagnostics v_count = row_count;

  -- Ninguna referencia puede apuntar a otra organización.
  if exists (
    select 1 from distributors d
    join distributors s on s.id = d.sponsor_id
    where d.tenant_id = p_tenant and s.tenant_id <> p_tenant
  ) or exists (
    select 1 from distributors d
    join distributors s on s.id = d.placement_parent_id
    where d.tenant_id = p_tenant and s.tenant_id <> p_tenant
  ) then
    raise exception 'Referencia entre organizaciones no permitida';
  end if;

  return v_count;
end $$;
