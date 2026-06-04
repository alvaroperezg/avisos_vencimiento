'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import { runCheckAction } from './actions'

type Poliza = {
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
}

type ToastMsg = { message: string; type: 'success' | 'error' }

type FormData = {
  comunidad: string
  compania: string
  numero_poliza: string
  vto_poliza: string
  notas: string
}

const emptyForm: FormData = {
  comunidad: '',
  compania: '',
  numero_poliza: '',
  vto_poliza: '',
  notas: '',
}

// ─── helpers ────────────────────────────────────────────────────────────────

function calcDias(vto: string | null): number | null {
  if (!vto) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vtoDate = new Date(vto)
  vtoDate.setHours(0, 0, 0, 0)
  return Math.floor((vtoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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

type BadgeInfo = { label: string; bg: string; text: string; dot: string }

function getBadge(dias: number | null): BadgeInfo {
  if (dias === null)
    return { label: 'SIN FECHA', bg: 'bg-gray-100', text: 'text-gray-500', dot: '⚪' }
  if (dias < 0)
    return { label: 'VENCIDA', bg: 'bg-red-900', text: 'text-white', dot: '⛔' }
  if (dias <= 3)
    return { label: 'URGENTE', bg: 'bg-red-100', text: 'text-red-700', dot: '🔴' }
  if (dias <= 30)
    return { label: '30 DÍAS', bg: 'bg-orange-100', text: 'text-orange-700', dot: '🟠' }
  if (dias <= 60)
    return { label: '60 DÍAS', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: '🟡' }
  return { label: 'OK', bg: 'bg-green-100', text: 'text-green-700', dot: '🟢' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatDias(dias: number | null): string {
  if (dias === null) return '—'
  if (dias < 0) return `Hace ${Math.abs(dias)} días`
  if (dias === 0) return 'Hoy'
  return `${dias} día${dias !== 1 ? 's' : ''}`
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 shadow-lg text-sm font-medium transition-all
        ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
    >
      <span>{toast.type === 'success' ? '✓' : '✕'}</span>
      <span>{toast.message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function PolizaModal({
  poliza,
  onClose,
  onSave,
}: {
  poliza: Poliza | null
  onClose: () => void
  onSave: (form: FormData) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(
    poliza
      ? {
          comunidad: poliza.comunidad,
          compania: poliza.compania,
          numero_poliza: poliza.numero_poliza ?? '',
          vto_poliza: poliza.vto_poliza ?? '',
          notas: poliza.notas ?? '',
        }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {poliza ? 'Editar póliza' : 'Nueva póliza'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comunidad *</label>
              <input
                required
                value={form.comunidad}
                onChange={set('comunidad')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Comunidad de propietarios..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Compañía *</label>
              <input
                required
                value={form.compania}
                onChange={set('compania')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Nombre de la aseguradora..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Póliza</label>
              <input
                value={form.numero_poliza}
                onChange={set('numero_poliza')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.vto_poliza}
                onChange={set('vto_poliza')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={form.notas}
                onChange={set('notas')}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Observaciones opcionales..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : poliza ? 'Guardar cambios' : 'Crear póliza'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPoliza, setEditingPoliza] = useState<Poliza | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [checkPending, startCheckTransition] = useTransition()
  const csvRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((message: string, type: ToastMsg['type']) => {
    setToast({ message, type })
  }, [])

  const loadPolizas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/polizas')
      if (!res.ok) throw new Error('Error al cargar')
      setPolizas(await res.json())
    } catch {
      showToast('Error al cargar las pólizas', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadPolizas() }, [loadPolizas])

  async function handleSave(form: FormData) {
    const url = editingPoliza ? `/api/polizas/${editingPoliza.id}` : '/api/polizas'
    const method = editingPoliza ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      showToast('Error al guardar la póliza', 'error')
      return
    }
    showToast(editingPoliza ? 'Póliza actualizada' : 'Póliza creada', 'success')
    setShowModal(false)
    setEditingPoliza(null)
    loadPolizas()
  }

  async function handleDelete(p: Poliza) {
    if (!confirm(`¿Eliminar la póliza de "${p.comunidad}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/polizas/${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      showToast('Error al eliminar la póliza', 'error')
      return
    }
    showToast('Póliza eliminada', 'success')
    loadPolizas()
  }

  function handleRunCheck() {
    startCheckTransition(async () => {
      try {
        const result = await runCheckAction()
        const msg =
          result.emailsSent > 0
            ? `Revisión completa: ${result.emailsSent} email${result.emailsSent !== 1 ? 's' : ''} enviado${result.emailsSent !== 1 ? 's' : ''}`
            : 'Revisión completa: no hay alertas pendientes'
        showToast(msg, 'success')
        loadPolizas()
      } catch {
        showToast('Error al ejecutar la revisión', 'error')
      }
    })
  }

  async function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1) // skip header row
    let imported = 0
    let failed = 0
    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const [comunidad, compania, vto_poliza, numero_poliza, notas] = cols
      if (!comunidad || !compania) { failed++; continue }
      const res = await fetch('/api/polizas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comunidad, compania, vto_poliza: vto_poliza || null, numero_poliza: numero_poliza || null, notas: notas || null }),
      })
      if (res.ok) imported++; else failed++
    }
    if (csvRef.current) csvRef.current.value = ''
    showToast(
      `CSV importado: ${imported} póliza${imported !== 1 ? 's' : ''} añadida${imported !== 1 ? 's' : ''}${failed ? `, ${failed} error${failed !== 1 ? 'es' : ''}` : ''}`,
      failed > 0 ? 'error' : 'success'
    )
    loadPolizas()
  }

  // Computed summary values
  const sorted = sortPolizas(polizas)
  const totalAlertas = polizas.filter(p => { const d = calcDias(p.vto_poliza); return d !== null && d >= 0 && d <= 60 }).length
  const sinFecha = polizas.filter(p => !p.vto_poliza).length
  const vencidas = polizas.filter(p => { const d = calcDias(p.vto_poliza); return d !== null && d < 0 }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestión de Seguros</h1>
            <p className="text-sm text-gray-500">Fincas Doble G</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunCheck}
              disabled={checkPending}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {checkPending ? 'Revisando…' : '▶ Ejecutar revisión ahora'}
            </button>
            <label className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              ↑ Importar CSV
              <input
                ref={csvRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVFile}
              />
            </label>
            <button
              onClick={() => { setEditingPoliza(null); setShowModal(true) }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Añadir póliza
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card label="Total pólizas" value={polizas.length} color="text-gray-800" />
          <Card label="Alertas activas (≤60 días)" value={totalAlertas} color="text-orange-600" />
          <Card label="Sin fecha asignada" value={sinFecha} color="text-gray-400" />
          <Card label="Vencidas" value={vencidas} color="text-red-700" />
        </div>

        {/* Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Pólizas</h2>
          </div>
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-sm">Cargando…</div>
          ) : sorted.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">
              No hay pólizas registradas.{' '}
              <button
                onClick={() => { setEditingPoliza(null); setShowModal(true) }}
                className="text-indigo-600 hover:underline"
              >
                Añade la primera
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Comunidad</th>
                    <th className="px-5 py-3 text-left font-medium">Compañía</th>
                    <th className="px-5 py-3 text-left font-medium">Nº Póliza</th>
                    <th className="px-5 py-3 text-left font-medium">Vencimiento</th>
                    <th className="px-5 py-3 text-left font-medium">Días restantes</th>
                    <th className="px-5 py-3 text-left font-medium">Estado</th>
                    <th className="px-5 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(p => {
                    const dias = calcDias(p.vto_poliza)
                    const badge = getBadge(dias)
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{p.comunidad}</td>
                        <td className="px-5 py-3.5 text-gray-600">{p.compania}</td>
                        <td className="px-5 py-3.5 text-gray-500">{p.numero_poliza ?? '—'}</td>
                        <td className="px-5 py-3.5 text-gray-600">{formatDate(p.vto_poliza)}</td>
                        <td className="px-5 py-3.5 text-gray-600">{formatDias(dias)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                            <span>{badge.dot}</span>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingPoliza(p); setShowModal(true) }}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
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

      {/* Modal */}
      {showModal && (
        <PolizaModal
          poliza={editingPoliza}
          onClose={() => { setShowModal(false); setEditingPoliza(null) }}
          onSave={handleSave}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
