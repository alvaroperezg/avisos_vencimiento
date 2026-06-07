'use client'

import { useState, useRef } from 'react'

const C = {
  primary: '#1B3A6B',
  secondary: '#2E86AB',
  danger: '#E74C3C',
  success: '#27AE60',
}

type Props = {
  polizaId: string
  comunidad: string
  compania: string
  documentoPath: string | null
  onRefresh: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

export function DocumentoModal({ polizaId, comunidad, compania, documentoPath, onRefresh, showToast }: Props) {
  const [open, setOpen] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/polizas/${polizaId}/documento`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      onRefresh()
      showToast('Documento subido correctamente', 'success')
    } catch {
      showToast('Error al subir el documento', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    setIframeError(false)
    setSignedUrl(null)
    try {
      const res = await fetch(`/api/polizas/${polizaId}/documento`)
      if (!res.ok) throw new Error('No se pudo obtener el documento')
      const { url } = await res.json()
      setSignedUrl(url)
    } catch {
      showToast('Error al cargar el documento', 'error')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar el documento de esta póliza? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/polizas/${polizaId}/documento`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar el documento', 'error'); return }
    setOpen(false)
    setSignedUrl(null)
    onRefresh()
    showToast('Documento eliminado', 'success')
  }

  // ── Sin documento: botón de subir ──
  if (!documentoPath) {
    return (
      <label
        title="Subir documento PDF"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 6,
          border: '1.5px solid #adb5bd', background: '#fff',
          color: '#adb5bd', fontSize: 12, fontWeight: 600,
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <span style={{ fontSize: 14 }}>{uploading ? '⏳' : '📤'}</span>
        <span>{uploading ? 'Subiendo…' : 'PDF'}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    )
  }

  // ── Con documento: botón de ver ──
  return (
    <>
      <button
        onClick={handleOpen}
        title="Ver documento PDF"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 6,
          border: `1.5px solid ${C.secondary}`, background: '#fff',
          color: C.secondary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14 }}>📎</span> PDF
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(27,58,107,0.55)', padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 920, height: '85vh',
            backgroundColor: '#fff', borderRadius: 12,
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: C.primary, padding: '16px 24px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{comunidad}</div>
                <div style={{ color: '#93c5e8', fontSize: 13, marginTop: 2 }}>{compania}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {signedUrl && (
                  <>
                    <button
                      onClick={() => window.open(signedUrl, '_blank')}
                      style={{ padding: '7px 16px', borderRadius: 6, border: '1.5px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ↓ Descargar
                    </button>
                    <button
                      onClick={handleDelete}
                      style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: C.danger, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      🗑 Eliminar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, color: '#6c757d' }}>
                  <div style={{ fontSize: 36 }}>⏳</div>
                  <div style={{ fontSize: 15 }}>Cargando documento…</div>
                </div>
              ) : signedUrl && !iframeError ? (
                <iframe
                  src={signedUrl}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  onError={() => setIframeError(true)}
                />
              ) : signedUrl && iframeError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                  <div style={{ fontSize: 40 }}>📄</div>
                  <p style={{ color: '#6c757d', fontSize: 15, margin: 0 }}>No se puede mostrar el PDF en el visor integrado.</p>
                  <button
                    onClick={() => window.open(signedUrl, '_blank')}
                    style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Abrir en nueva pestaña
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
