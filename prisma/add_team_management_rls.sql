-- ==========================================
-- Incremental: permite administrar el equipo del tenant
-- (cambiar rol de un miembro, quitarlo). El SELECT ya existía.
-- Correr en Supabase → SQL Editor
-- ==========================================

create policy "tenant_users_update" on tenant_users
  for update using (tenant_id in (select auth_tenant_ids()));

create policy "tenant_users_delete" on tenant_users
  for delete using (tenant_id in (select auth_tenant_ids()));
