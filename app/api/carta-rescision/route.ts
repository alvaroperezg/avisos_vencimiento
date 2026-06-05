import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  PageOrientation,
} from 'docx'

function formatDateEs(date: Date): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function formatDateDMY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function para(text: string, opts?: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; italic?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    alignment: opts?.align,
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 22,
        italics: opts?.italic,
        color: opts?.color,
      }),
    ],
  })
}

function blank(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: '' })] })
}

export async function POST(req: NextRequest) {
  const { id } = await req.json()

  const { data: poliza, error } = await getSupabaseAdmin()
    .from('polizas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !poliza) {
    return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 })
  }

  const today = new Date()
  const cif = poliza.cif ?? 'N/D'
  const direccion = poliza.direccion ?? 'N/D'
  const numeroPoliza = poliza.numero_poliza ?? 'N/D'
  const vto = poliza.vto_poliza ? formatDateDMY(poliza.vto_poliza) : 'N/D'

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.18),
              right: convertInchesToTwip(1.18),
            },
          },
        },
        children: [
          // ── Cabecera remitente ──
          para(poliza.comunidad.toUpperCase(), { bold: true, size: 24 }),
          para(`CIF: ${cif}`),
          para(`Dirección: ${direccion}`),
          para('Representada por: Fincas Doble G - Administración de Fincas'),

          blank(),

          // ── Fecha y lugar ──
          para(`[Localidad], ${formatDateEs(today)}`, { align: AlignmentType.RIGHT }),

          blank(),

          // ── Destinatario ──
          para('A/A: Departamento de Atención al Cliente'),
          para(poliza.compania.toUpperCase(), { bold: true }),

          blank(),

          // ── Asunto ──
          new Paragraph({
            children: [
              new TextRun({ text: 'ASUNTO: ', bold: true, size: 22 }),
              new TextRun({ text: 'Comunicación de no renovación de póliza al vencimiento', bold: true, size: 22 }),
            ],
          }),

          blank(),

          // ── Saludo ──
          para('Muy señores nuestros:'),

          blank(),

          // ── Cuerpo ──
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: 'Por medio de la presente, la Comunidad de Propietarios arriba indicada, debidamente representada, se dirige a ustedes para comunicarles su decisión de no renovar la póliza de seguro que a continuación se detalla, una vez llegado su vencimiento:', size: 22 })],
          }),

          blank(),

          // ── Datos de la póliza ──
          para('Datos de la póliza:', { bold: true }),
          para(`- Número de póliza: ${numeroPoliza}`),
          para(`- Tomador: ${poliza.comunidad}`),
          para(`- Riesgo asegurado: ${direccion}`),
          para(`- Fecha de vencimiento: ${vto}`),

          blank(),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: 'En consecuencia, les solicitamos que procedan a tramitar la baja de la citada póliza con efectos desde la fecha de su vencimiento, sin que se produzca renovación tácita ni cargo alguno posterior a dicha fecha.', size: 22 })],
          }),

          blank(),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: 'Les rogamos nos confirmen por escrito la recepción de la presente comunicación y la tramitación de la baja solicitada.', size: 22 })],
          }),

          blank(),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: 'Quedamos a su disposición para cualquier gestión que pueda ser necesaria al respecto.', size: 22 })],
          }),

          blank(),

          // ── Cierre ──
          para('Atentamente,'),

          blank(),
          blank(),

          // ── Firma ──
          para('_______________________________'),
          para('Fincas Doble G - Administración de Fincas', { bold: true }),
          para(`Administrador de la Comunidad de Propietarios de ${poliza.comunidad}`),

          blank(),

          // ── Nota ──
          para(
            'Nota: Se recomienda enviar esta carta por burofax con acuse de recibo o correo certificado, conservando el justificante de entrega como prueba de la comunicación en plazo.',
            { italic: true, color: '666666' }
          ),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const safeName = poliza.comunidad.replace(/[^a-zA-Z0-9À-ɏ\s-]/g, '').replace(/\s+/g, '-')
  const filename = `carta-rescision-${safeName}.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
