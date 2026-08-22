import { useState, type FormEvent } from 'react'
import { companyApi } from '@/api/api'
import type { CompanySummary } from '@/types'

interface Props {
  projectId: number
  onClose: () => void
  onCreated: (company: CompanySummary) => void
}

export default function CreateCompanyModal({ projectId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [secteur, setSecteur] = useState('')
  const [promoteur, setPromoteur] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const company = await companyApi.create(projectId, name.trim(), secteur.trim(), promoteur.trim())
      onCreated(company)
    } catch {
      setError("Erreur lors de la création de l'entreprise.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Nouvelle entreprise</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="co-name">Nom de l'entreprise *</label>
            <input
              id="co-name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Élevage Miavaka"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-secteur">Secteur d'activité</label>
            <input
              id="co-secteur"
              className="form-input"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              placeholder="Ex : Agriculture, Commerce, Services…"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-promoteur">Promoteur</label>
            <input
              id="co-promoteur"
              className="form-input"
              value={promoteur}
              onChange={(e) => setPromoteur(e.target.value)}
              placeholder="Nom du promoteur / porteur de projet"
            />
          </div>
          <div style={styles.footer}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Création…' : 'Créer'}
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
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 'var(--text-lg)', fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' },
}
