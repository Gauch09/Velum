'use client'

import { useState, useRef } from 'react'

export default function NotasOrden({ ordenId, notas }: { ordenId: string; notas: string | null }) {
  const [texto, setTexto] = useState(notas ?? '')
  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function abrirEditor() {
    setEditando(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  async function guardar() {
    if (saving) return
    const valor = texto.trim()
    if (valor === (notas ?? '')) { setEditando(false); return }
    setSaving(true)
    await fetch(`/api/ordenes/${ordenId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: valor || null }),
    })
    setSaving(false)
    setEditando(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setTexto(notas ?? ''); setEditando(false) }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) guardar()
  }

  if (editando) {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Escribí una nota para esta orden..."
          className="w-full bg-gray-800 text-gray-200 text-xs px-3 py-2 rounded-lg border border-gray-600 focus:border-green-600 outline-none resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { setTexto(notas ?? ''); setEditando(false) }}
            className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="text-green-400 hover:text-green-300 text-xs px-2 py-1 font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  if (texto) {
    return (
      <button
        onClick={abrirEditor}
        className="mt-2 w-full text-left group"
      >
        <p className="text-gray-500 text-xs leading-relaxed group-hover:text-gray-400 transition-colors border-l-2 border-gray-700 group-hover:border-gray-500 pl-2 py-0.5">
          {texto}
        </p>
      </button>
    )
  }

  return (
    <button
      onClick={abrirEditor}
      className="mt-2 text-gray-700 hover:text-gray-500 text-xs transition-colors"
    >
      + Agregar nota
    </button>
  )
}
