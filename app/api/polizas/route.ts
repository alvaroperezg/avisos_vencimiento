import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from('polizas').select('*')

  if (error) {
    console.log('Supabase error GET /api/polizas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await getSupabaseAdmin()
    .from('polizas')
    .insert({
      comunidad: body.comunidad,
      compania: body.compania,
      numero_poliza: body.numero_poliza || null,
      vto_poliza: body.vto_poliza || null,
      notas: body.notas || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
