-- ============================================================
--  Storage: bucket polizas-docs
--  Pegar en el SQL Editor de Supabase y ejecutar
-- ============================================================

insert into storage.buckets (id, name, public)
values ('polizas-docs', 'polizas-docs', false)
on conflict (id) do nothing;

create policy "Autenticado puede leer" on storage.objects
  for select using (bucket_id = 'polizas-docs');

create policy "Autenticado puede subir" on storage.objects
  for insert with check (bucket_id = 'polizas-docs');

create policy "Autenticado puede borrar" on storage.objects
  for delete using (bucket_id = 'polizas-docs');
