import { useState, useRef, useEffect } from 'react'

export interface NumRange { min: number; max: number }

interface RangeFilterDropdownProps {
  label: string
  /** Bornes globales de la colonne (ex: 0 et 100 pour un pourcentage) */
  min: number
  max: number
  /** Plage actuellement sélectionnée. null = pas de filtre (tout est affiché). */
  selected: NumRange | null
  onChange: (range: NumRange | null) => void
  /** Suffixe affiché après chaque valeur (ex: "%") */
  suffix?: string
}

/**
 * Filtre de colonne numérique façon Excel : icône entonnoir dans l'en-tête,
 * popover avec deux champs Min / Max (ex: filtrer la Complétion par pourcentage).
 */
export default function RangeFilterDropdown({ label, min, max, selected, onChange, suffix = '' }: RangeFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [draftMin, setDraftMin] = useState(min)
  const [draftMax, setDraftMax] = useState(max)
  const rootRef = useRef<HTMLDivElement>(null)

  const isActive = selected !== null

  // Initialise le brouillon à l'ouverture
  useEffect(() => {
    if (open) {
      setDraftMin(selected ? selected.min : min)
      setDraftMax(selected ? selected.max : max)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture au clic en dehors
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function applyDraft() {
    const lo = Math.min(draftMin, draftMax)
    const hi = Math.max(draftMin, draftMax)
    // Plage complète = équivaut à "aucun filtre"
    if (lo <= min && hi >= max) {
      onChange(null)
    } else {
      onChange({ min: lo, max: hi })
    }
    setOpen(false)
  }

  function clearFilter() {
    onChange(null)
    setOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={`Filtrer ${label}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          marginLeft: 4,
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: 11,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <i className="fas fa-filter" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            zIndex: 50,
            width: 200,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: 10,
            fontWeight: 400,
            textTransform: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Min{suffix}
              <input
                type="number"
                className="form-input"
                min={min}
                max={max}
                value={draftMin}
                onChange={(e) => setDraftMin(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                style={{ fontSize: 12, padding: '5px 6px', width: '81%', boxSizing: 'border-box', marginTop: 2 }}
                autoFocus
              />
            </label>
            <label style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Max{suffix}
              <input
                type="number"
                className="form-input"
                min={min}
                max={max}
                value={draftMax}
                onChange={(e) => setDraftMax(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                style={{ fontSize: 12, padding: '5px 6px', width: '81%', boxSizing: 'border-box', marginTop: 2 }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
              onClick={applyDraft}
            >
              OK
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
              onClick={clearFilter}
              disabled={!isActive}
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
