import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type Poliza = {
  id: string
  comunidad: string
  compania: string
  numero_poliza: string | null
  vto_poliza: string | null
  notas: string | null
  alerta_3_enviada: boolean
  alerta_30_enviada: boolean
  alerta_60_enviada: boolean
  created_at: string
  updated_at: string
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

// Convenience alias used throughout the codebase
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})
