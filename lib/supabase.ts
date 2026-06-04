import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
