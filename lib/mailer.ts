import nodemailer from 'nodemailer'
import type { Poliza } from './supabase'

export type AlertType = 60 | 30 | 3

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const subjectPrefix: Record<AlertType, string> = {
  60: '⚠️ Vencimiento en 60 días',
  30: '🔔 Vencimiento en 30 días',
  3: '🚨 URGENTE - Vencimiento en 3 días',
}

const alertColor: Record<AlertType, string> = {
  60: '#d97706',
  30: '#ea580c',
  3: '#dc2626',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export async function sendAlertEmail(
  poliza: Poliza,
  tipo: AlertType,
  diasRestantes: number
): Promise<void> {
  const subject = `${subjectPrefix[tipo]}: ${poliza.comunidad}`
  const recipients = [process.env.ALERT_EMAIL_1, process.env.ALERT_EMAIL_2]
    .filter(Boolean)
    .join(', ')

  const color = alertColor[tipo]

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background-color:${color};padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
        ${subjectPrefix[tipo]}: ${poliza.comunidad}
      </h1>
    </div>
    <div style="background-color:#ffffff;padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;background:#f9fafb;border-radius:4px;width:40%;">Comunidad</td>
          <td style="padding:10px 12px;color:#111827;">${poliza.comunidad}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;width:40%;">Compañía</td>
          <td style="padding:10px 12px;color:#111827;">${poliza.compania}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;background:#f9fafb;border-radius:4px;width:40%;">Nº Póliza</td>
          <td style="padding:10px 12px;color:#111827;">${poliza.numero_poliza ?? '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;width:40%;">Fecha de vencimiento</td>
          <td style="padding:10px 12px;color:#111827;">${poliza.vto_poliza ? formatDate(poliza.vto_poliza) : '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;background:#f9fafb;border-radius:4px;width:40%;">Días restantes</td>
          <td style="padding:10px 12px;font-weight:700;color:${color};">${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}</td>
        </tr>
        ${poliza.notas ? `
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#374151;width:40%;">Notas</td>
          <td style="padding:10px 12px;color:#6b7280;">${poliza.notas}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#6b7280;font-size:13px;">Gestión de Seguros · Fincas Doble G</p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"Gestión de Seguros · Fincas Doble G" <${process.env.GMAIL_USER}>`,
    to: recipients,
    subject,
    html,
  })
}
