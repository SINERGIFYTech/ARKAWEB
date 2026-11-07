-- ==========================================
-- Incremental: correo del distribuidor (necesario para invitarlo al portal)
-- Correr en Supabase → SQL Editor
-- ==========================================

alter table distributors add column if not exists email text;
