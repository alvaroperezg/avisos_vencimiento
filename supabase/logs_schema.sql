-- ============================================================
--  Tabla de logs del cron job
--  Pegar en el SQL Editor de Supabase y ejecutar
-- ============================================================

create table if not exists cron_logs (
  id              uuid        default gen_random_uuid() primary key,
  ejecutado_at    timestamptz default now(),
  emails_enviados integer     default 0,
  detalle         jsonb,
  error           text
);

-- Índice para consultas por fecha descendente
create index if not exists idx_cron_logs_at on cron_logs (ejecutado_at desc);

-- Sin RLS (acceso por service role key desde las API routes)
alter table cron_logs disable row level security;
