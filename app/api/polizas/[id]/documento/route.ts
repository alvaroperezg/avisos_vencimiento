import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const { data: poliza } = await getSupabaseAdmin()
    .from('polizas')
    .select('documento_path')
    .eq('id', id)
    .single()

  if (!poliza?.documento_path) {
    return NextResponse.json({ error: 'Sin documento' }, { status: 404 })
  }

  const { data, error } = await getSupabaseAdmin()
    .storage
    .from('polizas-docs')
    .createSignedUrl(poliza.documento_path, 3600)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const path = `poliza-${id}/${file.name}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await getSupabaseAdmin()
    .storage
    .from('polizas-docs')
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type || 'application/pdf',
      upsert: true,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: dbError } = await getSupabaseAdmin()
    .from('polizas')
    .update({ documento_path: path })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true, path })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const { data: poliza } = await getSupabaseAdmin()
    .from('polizas')
    .select('documento_path')
    .eq('id', id)
    .single()

  if (poliza?.documento_path) {
    await getSupabaseAdmin()
      .storage
      .from('polizas-docs')
      .remove([poliza.documento_path])
  }

  await getSupabaseAdmin()
    .from('polizas')
    .update({ documento_path: null })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
