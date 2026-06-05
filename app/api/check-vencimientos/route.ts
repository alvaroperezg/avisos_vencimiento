import { NextRequest, NextResponse } from 'next/server'
import { checkVencimientos } from '@/lib/checkVencimientos'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await checkVencimientos()
    return NextResponse.json({
      ejecutado: true,
      fecha: new Date().toISOString(),
      emailsEnviados: result.emailsSent,
      detalle: result.alerts,
      errors: result.errors,
    })
  } catch (err) {
    return NextResponse.json(
      { ejecutado: false, fecha: new Date().toISOString(), error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
