import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type Poliza = {
  id: string
  comunidad: string
  compania: string
  numero_poliza: string | null
  vto_poliza: string | null
  notas: string | null
  cif: string | null
  direccion: string | null
  alerta_3_enviada: boolean
  alerta_30_enviada: boolean
  alerta_60_enviada: boolean
  created_at: string
  updated_at: string
}

// Anon key — NEXT_PUBLIC_ vars are baked in at Vercel build time
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Service role key — lazy init so build doesn't fail without SUPABASE_SERVICE_ROLE_KEY
let _admin: SupabaseClient | null = null
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}
