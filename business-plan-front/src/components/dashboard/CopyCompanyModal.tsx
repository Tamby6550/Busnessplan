import { useMemo, useState } from 'react'
import type { CompanySummary, ProjectSummary } from '@/types'

interface Props {
  company: CompanySummary
  /** Projet dans lequel se trouve l'entreprise d'origine */
  sourceProjectId: number
  /** Tous les projets, destinations possibles */
  projects: ProjectSummary[]
  isLoading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (targetProjectIds: number[], name: string) => void
}

/**
 * "Copier vers…" — choix du nom et des projets de destination en un seul geste.
 *
 * Pas de copier/coller en deux temps : un presse-papier applicatif serait
 * invisible à l'écran, et l'utilisateur perdrait la trace de ce qu'il a copié
 * dès qu'il ferait autre chose. Ici tout se décide dans la même fenêtre.
 *
 * Le projet d'origine reste une destination valide — y copier revient à
 * dupliquer sur place, avec la même règle de nommage.
 */
export default function CopyCompanyModal({
  company,
  sourceProjectId,
  projects,
  isLoading,
  error,
  onCancel,
  onConfirm,
}: Props) {
  // Nom par défaut homogène avec la duplication de projet : "<nom>-copie".
  // Le serveur ajoutera "(1)", "(2)"… si ce nom est déjà pris dans une destination.
  const [name, setName] = useState(`${company.name}-copie`)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return projects
    return projects.filter((p) => p.name.toLowerCase().includes(q))
  }, [projects, search])

  function toggle(projectId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const count = selected.size
  const canSubmit = count > 0 && name.trim() !== '' && !isLoading

  return (
    <div style={styles.overlay} onClick={isLoading ? undefined : onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Copier « {company.name} » vers d'autres projets</h3>
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>✕</button>
        </div>

        <p style={styles.intro}>
          Toutes les données de l'entreprise seront copiées : produits, matières premières,
          personnel, charges, investissements et paramètres économiques.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="copy-company-name">Nom de la copie *</label>
          <input
            id="copy-company-name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group" style={{ minHeight: 0 }}>
          <label className="form-label">Projets de destination *</label>

          <input
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet…"
            style={{ marginBottom: 'var(--space-2)' }}
            disabled={isLoading}
          />

          <div style={styles.list}>
            {filtered.length === 0 && (
              <div style={styles.empty}>Aucun projet ne correspond à cette recherche.</div>
            )}
            {filtered.map((p) => (
              <label key={p.id} style={styles.row}>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  disabled={isLoading}
                />
                <span style={styles.rowName}>{p.name}</span>
                {p.id === sourceProjectId && (
                  <span style={styles.badge}>projet actuel</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={isLoading}>
            Annuler
          </button>
          <button
            type="button"
            style={{
              ...styles.confirmBtn,
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? 'pointer' : 'default',
            }}
            onClick={() => onConfirm([...selected], name.trim())}
            disabled={!canSubmit}
          >
            {isLoading
              ? 'Copie…'
              : count > 1 ? `Copier vers ${count} projets` : 'Copier'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120,
    padding: 'var(--space-4)',
  },
  modal: {
    background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520,
    maxHeight: '90vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
    padding: 'var(--space-6)',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)',
  },
  title: {
    fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1.3,
  },
  intro: {
    fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0,
  },
  list: {
    border: '1px solid var(--color-border, #e5e7eb)',
    borderRadius: 'var(--radius-md, 8px)',
    // Hauteur bornée : la liste défile au lieu de faire grandir la modale,
    // sinon les boutons Annuler / Copier finissent hors de l'écran.
    maxHeight: 240,
    minHeight: 96,
    overflowY: 'auto',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    padding: '8px 12px', cursor: 'pointer', fontSize: 'var(--text-sm)',
    borderBottom: '1px solid var(--color-border, #f1f5f9)',
  },
  rowName: {
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  badge: {
    fontSize: 11, color: 'var(--color-text-muted)',
    background: 'var(--color-bg, #f1f5f9)', borderRadius: 999, padding: '2px 8px',
  },
  empty: {
    padding: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textAlign: 'center',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-2)',
  },
  cancelBtn: {
    background: '#ffffff',
    border: '1px solid var(--color-border, #d1d5db)',
    color: 'var(--color-text, #374151)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '8px 18px', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
  },
  confirmBtn: {
    background: 'var(--color-primary)',
    border: 'none', color: '#ffffff',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '8px 18px', fontSize: 'var(--text-sm)', fontWeight: 600,
  },
}
