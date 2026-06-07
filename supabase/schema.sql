-- ============================================================
--  Schema: Gestión de Seguros · Fincas Doble G
--  Pegar este SQL en el editor de Supabase y ejecutar
-- ============================================================

CREATE TABLE IF NOT EXISTS polizas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  comunidad        TEXT        NOT NULL,
  compania         TEXT        NOT NULL,
  numero_poliza    TEXT,
  vto_poliza       DATE,
  notas            TEXT,
  alerta_3_enviada  BOOLEAN     NOT NULL DEFAULT FALSE,
  alerta_30_enviada BOOLEAN     NOT NULL DEFAULT FALSE,
  alerta_60_enviada BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS polizas_updated_at ON polizas;
CREATE TRIGGER polizas_updated_at
  BEFORE UPDATE ON polizas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Desactivar RLS (la app usa la service role key, no hay usuarios finales)
ALTER TABLE polizas DISABLE ROW LEVEL SECURITY;

-- Índice para consultas por fecha de vencimiento
CREATE INDEX IF NOT EXISTS idx_polizas_vto ON polizas (vto_poliza);

-- ============================================================
--  Migración: añadir campos CIF y Dirección
--  (ejecutar solo si la tabla ya existía sin estos campos)
-- ============================================================
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS cif TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS documento_path TEXT;
