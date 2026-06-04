import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error, count } = await supabase
    .from('polizas')
    .select('*', { count: 'exact' })

  return NextResponse.json({
    data: data,
    error: error,
    count: count,
    hasData: data && data.length > 0,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
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
