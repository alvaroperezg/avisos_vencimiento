import { getSupabaseAdmin } from './supabase'
import { sendAlertEmail } from './mailer'
import type { AlertType } from './mailer'

function calcDiasRestantes(vtoPoliza: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vto = new Date(vtoPoliza)
  vto.setHours(0, 0, 0, 0)
  return Math.floor((vto.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export type CheckResult = {
  totalPolizas: number
  emailsSent: number
  alerts: Array<{ comunidad: string; tipo: AlertType; dias: number }>
  errors: string[]
}

export async function checkVencimientos(): Promise<CheckResult> {
  const { data: polizas, error } = await getSupabaseAdmin()
    .from('polizas')
    .select('*')
    .not('vto_poliza', 'is', null)

  if (error) throw new Error(`Supabase error: ${error.message}`)

  let emailsSent = 0
  const alerts: CheckResult['alerts'] = []
  const errors: string[] = []

  for (const poliza of polizas ?? []) {
    const dias = calcDiasRestantes(poliza.vto_poliza as string)

    if (dias < 0) continue

    let alertType: AlertType | null = null
    let updateField: string | null = null

    if (dias <= 3 && !poliza.alerta_3_enviada) {
      alertType = 3
      updateField = 'alerta_3_enviada'
    } else if (dias <= 30 && !poliza.alerta_30_enviada) {
      alertType = 30
      updateField = 'alerta_30_enviada'
    } else if (dias <= 60 && !poliza.alerta_60_enviada) {
      alertType = 60
      updateField = 'alerta_60_enviada'
    }

    if (alertType !== null && updateField !== null) {
      try {
        await sendAlertEmail(poliza, alertType, dias)
        await getSupabaseAdmin()
          .from('polizas')
          .update({ [updateField]: true })
          .eq('id', poliza.id)
        emailsSent++
        alerts.push({ comunidad: poliza.comunidad, tipo: alertType, dias })
      } catch (err) {
        errors.push(
          `Error en "${poliza.comunidad}": ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  const result: CheckResult = {
    totalPolizas: polizas?.length ?? 0,
    emailsSent,
    alerts,
    errors,
  }

  // Guardar log de ejecución (fallo silencioso para no interrumpir el resultado)
  try {
    await getSupabaseAdmin()
      .from('cron_logs')
      .insert({
        emails_enviados: emailsSent,
        detalle: alerts,
        error: errors.length > 0 ? errors.join('\n') : null,
      })
  } catch {
    // No interrumpir si falla el log
  }

  return result
}
