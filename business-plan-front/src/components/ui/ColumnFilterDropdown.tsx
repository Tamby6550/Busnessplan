import { useState, useRef, useEffect, useMemo } from 'react'

interface ColumnFilterDropdownProps {
  /** Toutes les valeurs de la colonne (une par ligne, doublons inclus) */
  values: string[]
  /** Valeurs actuellement sélectionnées. null = pas de filtre (tout est affiché). */
  selected: Set<string> | null
  /** Appelé avec la nouvelle sélection. null = filtre retiré. */
  onChange: (selected: Set<string> | null) => void
  label: string
}

/**
 * Filtre de colonne façon Excel : icône entonnoir dans l'en-tête,
 * popover avec recherche + liste à cocher des valeurs uniques.
 */
export default function ColumnFilterDropdown({ values, selected, onChange, label }: ColumnFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  const uniqueValues = useMemo(() => {
    const set = new Set(values.map((v) => (v && v.trim() !== '' ? v : '(Vide)')))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [values])

  const isActive = selected !== null

  // Initialise le brouillon à l'ouverture
  useEffect(() => {
    if (open) {
      setDraft(selected ? new Set(selected) : new Set(uniqueValues))
      setSearch('')
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

  const filteredList = uniqueValues.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase()),
  )

  const allFilteredChecked = filteredList.length > 0 && filteredList.every((v) => draft.has(v))

  function toggleValue(v: string) {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  function toggleSelectAllFiltered() {
    setDraft((prev) => {
      const next = new Set(prev)
      if (allFilteredChecked) {
        filteredList.forEach((v) => next.delete(v))
      } else {
        filteredList.forEach((v) => next.add(v))
      }
      return next
    })
  }

  function applyDraft() {
    // Si tout est coché, on retire le filtre (équivaut à "aucun filtre")
    if (draft.size === uniqueValues.length) {
      onChange(null)
    } else {
      onChange(new Set(draft))
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
            width: 220,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: 10,
            fontWeight: 400,
            textTransform: 'none',
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
            autoFocus
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '3px 2px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', marginBottom: 4, paddingBottom: 6 }}>
            <input type="checkbox" checked={allFilteredChecked} onChange={toggleSelectAllFiltered} />
            Tout sélectionner
          </label>

          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredList.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 2px' }}>Aucun résultat</div>
            )}
            {filteredList.map((v) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 2px', cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.has(v)} onChange={() => toggleValue(v)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
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
