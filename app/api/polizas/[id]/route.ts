import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const updateData: Record<string, unknown> = {
    comunidad: body.comunidad,
    compania: body.compania,
    numero_poliza: body.numero_poliza || null,
    vto_poliza: body.vto_poliza || null,
    notas: body.notas || null,
  }

  // Reset alert flags when vto_poliza changes so alerts fire again for the new date
  if ('vto_poliza' in body) {
    updateData.alerta_3_enviada = false
    updateData.alerta_30_enviada = false
    updateData.alerta_60_enviada = false
  }

  const { data, error } = await supabase
    .from('polizas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase.from('polizas').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
