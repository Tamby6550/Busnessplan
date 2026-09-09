import { useState, type FormEvent } from 'react'
import { projectApi } from '@/api/api'
import type { ProjectSummary } from '@/types'

interface Props {
  project: ProjectSummary
  onClose: () => void
  onUpdated: (id: number, name: string, description: string) => void
}

/**
 * Modification du nom et de la description d'un projet.
 * Volontairement calquée sur la modale de création (mêmes champs, même mise en
 * page) pour que l'utilisateur retrouve exactement la même interface.
 */
export default function EditProjectModal({ project, onClose, onUpdated }: Props) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await projectApi.update(project.id, name.trim(), description.trim())
      onUpdated(project.id, name.trim(), description.trim())
    } catch {
      setError('Erreur lors de la modification du projet.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Modifier le projet</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '0 var(--space-6)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-name">Nom du projet *</label>
            <input
              id="edit-proj-name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-desc">Description</label>
            <textarea
              id="edit-proj-desc"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle…"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={styles.footer}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480,
    display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
    padding: 'var(--space-6)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: {
    fontSize: 'var(--text-lg)', fontWeight: 700,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-2)',
  },
}
