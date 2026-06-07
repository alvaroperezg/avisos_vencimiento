'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import { runCheckAction } from './actions'
import { DocumentoModal } from '@/components/DocumentoModal'

// ─── Types ───────────────────────────────────────────────────────────────────

type Poliza = {
  id: string
  comunidad: string
  compania: string
  numero_poliza: string | null
  vto_poliza: string | null
  notas: string | null
  cif: string | null
  direccion: string | null
  documento_path: string | null
  alerta_3_enviada: boolean
  alerta_30_enviada: boolean
  alerta_60_enviada: boolean
  created_at: string
}

type CronLog = {
  id: string
  ejecutado_at: string
  emails_enviados: number
  detalle: Array<{ comunidad: string; tipo: number; dias: number }> | null
  error: string | null
}

type ToastMsg = { message: string; type: 'success' | 'error' }

type FormData = {
  comunidad: string
  compania: string
  numero_poliza: string
  vto_poliza: string
  notas: string
  cif: string
  direccion: string
}

const emptyForm: FormData = {
  comunidad: '',
  compania: '',
  numero_poliza: '',
  vto_poliza: '',
  notas: '',
  cif: '',
  direccion: '',
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  primary: '#1B3A6B',
  secondary: '#2E86AB',
  accent: '#E8F4F8',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  neutral: '#F8F9FA',
  text: '#2C3E50',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDias(vto: string | null): number | null {
  if (!vto) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(vto)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function statusPriority(dias: number | null): number {
  if (dias === null) return 5
  if (dias < 0) return 4
  if (dias <= 3) return 0
  if (dias <= 30) return 1
  if (dias <= 60) return 2
  return 3
}

function sortPolizas(list: Poliza[]): Poliza[] {
  return [...list].sort((a, b) => {
    const da = calcDias(a.vto_poliza)
    const db = calcDias(b.vto_poliza)
    const pa = statusPriority(da)
    const pb = statusPriority(db)
    if (pa !== pb) return pa - pb
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })
}

type BadgeInfo = { label: string; bg: string; textColor: string; icon: string }

function getBadge(dias: number | null): BadgeInfo {
  if (dias === null)
    return { label: 'SIN FECHA', bg: '#F0F0F0', textColor: '#6c757d', icon: '📅' }
  if (dias < 0)
    return { label: 'VENCIDA', bg: C.danger, textColor: '#fff', icon: '✗' }
  if (dias <= 3)
    return { label: 'URGENTE', bg: '#fde8e8', textColor: C.danger, icon: '⚡' }
  if (dias <= 30)
    return { label: '30 DÍAS', bg: '#fef3e2', textColor: C.warning, icon: '🔔' }
  if (dias <= 60)
    return { label: '60 DÍAS', bg: '#fefce8', textColor: '#b7950b', icon: '⚠️' }
  return { label: 'OK', bg: '#e8f8f0', textColor: C.success, icon: '✓' }
}

function getDiasColor(dias: number | null): string {
  if (dias === null) return '#adb5bd'
  if (dias < 0) return C.danger
  if (dias <= 3) return C.danger
  if (dias <= 30) return C.warning
  if (dias <= 60) return '#b7950b'
  return C.success
}

function formatDate(v: string | null): string {
  if (!v) return '—'
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

function formatDias(dias: number | null): string {
  if (dias === null) return '—'
  if (dias < 0) return `${Math.abs(dias)}d vencida`
  if (dias === 0) return 'Hoy'
  return `${dias} día${dias !== 1 ? 's' : ''}`
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function ShieldCheckIcon({ size = 28, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function IconDocument({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconBell({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function IconCalendarX({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="14" x2="14" y2="18" />
      <line x1="14" y1="14" x2="10" y2="18" />
    </svg>
  )
}

function IconClock({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 12,
      backgroundColor: toast.type === 'success' ? C.success : C.danger,
      color: '#fff', padding: '14px 20px', borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      fontSize: 14, fontWeight: 500, maxWidth: 380,
    }}>
      <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✓' : '✕'}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, fontSize: 16, padding: 0, marginLeft: 4 }}>✕</button>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function PolizaModal({ poliza, onClose, onSave }: {
  poliza: Poliza | null
  onClose: () => void
  onSave: (form: FormData) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(
    poliza
      ? { comunidad: poliza.comunidad, compania: poliza.compania, numero_poliza: poliza.numero_poliza ?? '', vto_poliza: poliza.vto_poliza ?? '', notas: poliza.notas ?? '', cif: poliza.cif ?? '', direccion: poliza.direccion ?? '' }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #dee2e6',
    borderRadius: 7, fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(27,58,107,0.45)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ backgroundColor: C.primary, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheckIcon size={22} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 700 }}>
              {poliza ? 'Editar póliza' : 'Nueva póliza'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Comunidad *</label>
              <input required value={form.comunidad} onChange={set('comunidad')} style={inputStyle} placeholder="Nombre de la comunidad" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Compañía aseguradora *</label>
              <input required value={form.compania} onChange={set('compania')} style={inputStyle} placeholder="Nombre de la aseguradora" />
            </div>
            <div>
              <label style={labelStyle}>Nº Póliza</label>
              <input value={form.numero_poliza} onChange={set('numero_poliza')} style={inputStyle} placeholder="Opcional" />
            </div>
            <div>
              <label style={labelStyle}>Fecha de vencimiento</label>
              <input type="date" value={form.vto_poliza} onChange={set('vto_poliza')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CIF</label>
              <input value={form.cif} onChange={set('cif')} style={inputStyle} placeholder="Ej: H12345678" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Dirección</label>
              <input value={form.direccion} onChange={set('direccion')} style={inputStyle} placeholder="Dirección de la comunidad" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notas</label>
              <textarea value={form.notas} onChange={set('notas')} rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="Observaciones opcionales..." />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 7, border: '1.5px solid #dee2e6', background: '#fff', color: '#495057', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 24px', borderRadius: 7, border: 'none', background: saving ? '#6c9fcf' : C.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : poliza ? 'Guardar cambios' : 'Crear póliza'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, borderColor, valueColor, icon }: {
  label: string; value: number; borderColor: string; valueColor: string; icon: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '20px 22px', borderLeft: `5px solid ${borderColor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: `${borderColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: valueColor, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6c757d', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Table section header ──────────────────────────────────────────────────────

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.primary }}>
        {title}
        {badge && (
          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: '#6c757d', background: C.accent, padding: '2px 10px', borderRadius: 20 }}>
            {badge}
          </span>
        )}
      </h2>
    </div>
  )
}

// ─── Row detail helpers ───────────────────────────────────────────────────────

function DetailField({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? '#2C3E50' : '#adb5bd' }}>{value ?? '—'}</div>
    </div>
  )
}

function AlertSentBadge({ label, sent }: { label: string; sent: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: sent ? '#e8f8f0' : '#f0f0f0', color: sent ? '#27AE60' : '#adb5bd' }}>
      {sent ? '✓' : '○'} {label}
    </span>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [cronLogs, setCronLogs] = useState<CronLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPoliza, setEditingPoliza] = useState<Poliza | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [checkPending, startCheckTransition] = useTransition()
  const csvRef = useRef<HTMLInputElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const showToast = useCallback((message: string, type: ToastMsg['type']) => {
    setToast({ message, type })
  }, [])

  const loadCronLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/cron-logs')
      if (res.ok) {
        const result = await res.json()
        setCronLogs(Array.isArray(result) ? result : [])
      }
    } catch {
      // Logs son no-críticos, fallo silencioso
    }
  }, [])

  const loadPolizas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/polizas')
      if (!res.ok) throw new Error('Error al cargar')
      const result = await res.json()
      setPolizas(Array.isArray(result) ? result : [])
    } catch {
      showToast('Error al cargar las pólizas', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadPolizas()
    loadCronLogs()
  }, [loadPolizas, loadCronLogs])

  async function handleSave(form: FormData) {
    const url = editingPoliza ? `/api/polizas/${editingPoliza.id}` : '/api/polizas'
    const method = editingPoliza ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { showToast('Error al guardar la póliza', 'error'); return }
    showToast(editingPoliza ? 'Póliza actualizada correctamente' : 'Póliza creada correctamente', 'success')
    setShowModal(false)
    setEditingPoliza(null)
    loadPolizas()
  }

  async function handleDelete(p: Poliza) {
    if (!confirm(`¿Eliminar la póliza de "${p.comunidad}"?\nEsta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/polizas/${p.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar la póliza', 'error'); return }
    showToast('Póliza eliminada', 'success')
    loadPolizas()
  }

  async function handleDownloadCarta(p: Poliza) {
    try {
      const response = await fetch('/api/carta-rescision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      })
      if (!response.ok) throw new Error('Error al generar la carta')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `carta-rescision-${p.comunidad}.docx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showToast('Error al generar la carta de rescisión', 'error')
    }
  }

  function handleRunCheck() {
    startCheckTransition(async () => {
      try {
        const result = await runCheckAction()
        const msg = result.emailsSent > 0
          ? `Revisión completa — ${result.emailsSent} email${result.emailsSent !== 1 ? 's' : ''} enviado${result.emailsSent !== 1 ? 's' : ''}`
          : 'Revisión completa — no hay alertas pendientes'
        showToast(msg, 'success')
        loadPolizas()
        loadCronLogs()
      } catch {
        showToast('Error al ejecutar la revisión', 'error')
      }
    })
  }

  async function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1)
    let imported = 0, failed = 0
    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const [comunidad, compania, vto_poliza, numero_poliza, notas] = cols
      if (!comunidad || !compania) { failed++; continue }
      const res = await fetch('/api/polizas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comunidad, compania, vto_poliza: vto_poliza || null, numero_poliza: numero_poliza || null, notas: notas || null }),
      })
      if (res.ok) imported++; else failed++
    }
    if (csvRef.current) csvRef.current.value = ''
    showToast(
      `CSV importado: ${imported} póliza${imported !== 1 ? 's' : ''} añadida${imported !== 1 ? 's' : ''}${failed ? ` · ${failed} error${failed !== 1 ? 'es' : ''}` : ''}`,
      failed > 0 ? 'error' : 'success'
    )
    loadPolizas()
  }

  const sorted = sortPolizas(polizas)
  const totalAlertas = polizas.filter(p => { const d = calcDias(p.vto_poliza); return d !== null && d >= 0 && d <= 60 }).length
  const sinFecha = polizas.filter(p => !p.vto_poliza).length
  const vencidas = polizas.filter(p => { const d = calcDias(p.vto_poliza); return d !== null && d < 0 }).length

  const outlineBtn: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.7)',
    background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  }

  const tableHeaderCell: React.CSSProperties = {
    padding: '13px 16px', color: '#fff', fontWeight: 600,
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.neutral, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{ backgroundColor: C.primary, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheckIcon size={28} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.3px' }}>Fincas Doble G</div>
              <div style={{ color: '#93c5e8', fontSize: 13, marginTop: 2 }}>Gestión de Seguros de Comunidades</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleRunCheck} disabled={checkPending} style={{ ...outlineBtn, opacity: checkPending ? 0.6 : 1 }}>
              <span style={{ fontSize: 15 }}>▶</span>
              {checkPending ? 'Revisando…' : 'Ejecutar revisión'}
            </button>
            <label style={{ ...outlineBtn, cursor: 'pointer' }}>
              <span style={{ fontSize: 15 }}>↑</span>
              Importar CSV
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVFile} />
            </label>
            <button onClick={() => { setEditingPoliza(null); setShowModal(true) }} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#fff', color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Añadir póliza
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 48px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <SummaryCard label="Total pólizas" value={polizas.length} borderColor={C.secondary} valueColor={C.primary} icon={<IconDocument color={C.secondary} />} />
          <SummaryCard label="Alertas activas (≤60 días)" value={totalAlertas} borderColor={C.warning} valueColor={C.warning} icon={<IconBell color={C.warning} />} />
          <SummaryCard label="Sin fecha asignada" value={sinFecha} borderColor="#adb5bd" valueColor="#6c757d" icon={<IconCalendarX color="#adb5bd" />} />
          <SummaryCard label="Vencidas" value={vencidas} borderColor={C.danger} valueColor={C.danger} icon={<IconClock color={C.danger} />} />
        </div>

        {/* ── Polizas Table ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 28 }}>
          <SectionHeader title="Pólizas activas" badge={!loading ? `${sorted.length} registros` : undefined} />
          {loading ? (
            <div style={{ padding: '80px 24px', textAlign: 'center', color: '#adb5bd', fontSize: 15 }}>Cargando pólizas…</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ color: '#6c757d', fontSize: 15, margin: 0 }}>
                No hay pólizas registradas.{' '}
                <button onClick={() => { setEditingPoliza(null); setShowModal(true) }} style={{ background: 'none', border: 'none', color: C.secondary, cursor: 'pointer', fontWeight: 600, fontSize: 15, padding: 0 }}>
                  Añade la primera póliza
                </button>
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: C.primary }}>
                    {['Comunidad', 'Compañía', 'Vencimiento', 'Días restantes', 'Estado', 'Acciones'].map((h, i) => (
                      <th key={h} style={{ ...tableHeaderCell, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, idx) => {
                    const dias = calcDias(p.vto_poliza)
                    const badge = getBadge(dias)
                    const rowBg = idx % 2 === 0 ? '#fff' : C.neutral
                    const isExpanded = expandedId === p.id
                    return [
                      <tr key={`${p.id}-row`}
                        style={{ backgroundColor: rowBg, transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? '#eef5fb' : rowBg)}>
                        <td style={{ padding: '13px 16px', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: C.text }}>{p.comunidad}</span>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              title={isExpanded ? 'Cerrar detalle' : 'Ver detalle'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isExpanded ? C.secondary : '#bdc3c7', padding: '1px 3px', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
                            >
                              ⓘ
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', color: '#495057', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0' }}>{p.compania}</td>
                        <td style={{ padding: '13px 16px', color: '#495057', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{formatDate(p.vto_poliza)}</td>
                        <td style={{ padding: '13px 16px', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: getDiasColor(dias) }}>{formatDias(dias)}</span>
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: badge.bg, color: badge.textColor, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button onClick={() => handleDownloadCarta(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.success}`, background: '#fff', color: C.success, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Descargar carta de rescisión">
                              <span style={{ fontSize: 14 }}>📄</span> Carta
                            </button>
                            <DocumentoModal
                              polizaId={p.id}
                              comunidad={p.comunidad}
                              compania={p.compania}
                              documentoPath={p.documento_path}
                              onRefresh={loadPolizas}
                              showToast={showToast}
                            />
                            <button onClick={() => { setEditingPoliza(p); setShowModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.secondary}`, background: '#fff', color: C.secondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <IconEdit /> Editar
                            </button>
                            <button onClick={() => handleDelete(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.danger}`, background: '#fff', color: C.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <IconTrash /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isExpanded ? (
                        <tr key={`${p.id}-detail`}>
                          <td colSpan={6} style={{ padding: 0, borderBottom: '2px solid #E8F4F8' }}>
                            <div style={{ backgroundColor: '#f0f6fb', padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, borderTop: `2px solid ${C.accent}` }}>
                              <DetailField label="Nº Póliza" value={p.numero_poliza} />
                              <DetailField label="CIF" value={p.cif} />
                              <DetailField label="Compañía aseguradora" value={p.compania} />
                              <DetailField label="Fecha de vencimiento" value={formatDate(p.vto_poliza)} />
                              <DetailField label="Dirección" value={p.direccion} wide />
                              <div>
                                <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Alertas enviadas</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <AlertSentBadge label="60 días" sent={p.alerta_60_enviada} />
                                  <AlertSentBadge label="30 días" sent={p.alerta_30_enviada} />
                                  <AlertSentBadge label="3 días" sent={p.alerta_3_enviada} />
                                </div>
                              </div>
                              {p.notas && <DetailField label="Notas" value={p.notas} wide />}
                            </div>
                          </td>
                        </tr>
                      ) : null,
                    ]
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Historial de ejecuciones ── */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <SectionHeader title="Historial de ejecuciones" badge="Últimas 10" />
          {cronLogs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🕐</div>
              <p style={{ color: '#adb5bd', fontSize: 14, margin: 0 }}>Aún no hay ejecuciones registradas</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: C.primary }}>
                    {['Fecha y hora', 'Emails enviados', 'Alertas generadas', 'Estado'].map(h => (
                      <th key={h} style={{ ...tableHeaderCell, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cronLogs.map((log, idx) => {
                    const { date, time } = formatDateTime(log.ejecutado_at)
                    const alertas = Array.isArray(log.detalle) ? log.detalle : []
                    const rowBg = idx % 2 === 0 ? '#fff' : C.neutral
                    return (
                      <tr key={log.id} style={{ backgroundColor: rowBg, borderBottom: '1px solid #f0f0f0' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = rowBg)}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: C.text, whiteSpace: 'nowrap' }}>
                          {date}
                          <span style={{ color: '#6c757d', marginLeft: 8, fontWeight: 400 }}>{time}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: log.emails_enviados > 0 ? C.success : '#adb5bd' }}>
                            {log.emails_enviados}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#495057', fontSize: 13, maxWidth: 320 }}>
                          {alertas.length > 0
                            ? alertas.map((a, i) => (
                                <span key={i} style={{ display: 'inline-block', background: C.accent, borderRadius: 12, padding: '2px 8px', marginRight: 4, marginBottom: 2, fontSize: 12, color: C.primary, fontWeight: 500 }}>
                                  {a.comunidad} ({a.tipo}d)
                                </span>
                              ))
                            : <span style={{ color: '#adb5bd' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.error ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: '#fde8e8', color: C.danger, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              ✕ Error
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: '#e8f8f0', color: C.success, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              ✓ OK
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: C.primary, padding: '18px 32px', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#93c5e8', fontSize: 13 }}>
          Fincas Doble G · Gestión de Seguros · © {new Date().getFullYear()}
        </p>
      </footer>

      {showModal && (
        <PolizaModal
          poliza={editingPoliza}
          onClose={() => { setShowModal(false); setEditingPoliza(null) }}
          onSave={handleSave}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
