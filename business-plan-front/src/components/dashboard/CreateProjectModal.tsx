import { useState, type FormEvent } from 'react'
import { projectApi } from '@/api/api'
import type { ProjectSummary } from '@/types'

interface Props {
  onClose: () => void
  onCreated: (project: ProjectSummary) => void
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const project = await projectApi.create(name.trim(), description.trim())
      onCreated(project)
    } catch {
      setError('Erreur lors de la création du projet.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Nouveau projet</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '0 var(--space-6)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-name">Nom du projet *</label>
            <input
              id="proj-name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Plan de financement 2025"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-desc">Description</label>
            <textarea
              id="proj-desc"
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
              {isLoading ? 'Création…' : 'Créer le projet'}
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
