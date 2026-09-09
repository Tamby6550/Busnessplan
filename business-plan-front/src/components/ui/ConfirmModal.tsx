import type { ReactNode } from 'react'

interface Props {
  /** Titre de la modale — doit dire précisément ce qui va se passer */
  title: string
  /** Message explicatif ; accepte du texte enrichi si besoin */
  message: ReactNode
  /** Libellé du bouton d'action, ex : "Dupliquer" */
  confirmLabel: string
  /** Libellé affiché pendant le traitement, ex : "Duplication…" */
  loadingLabel?: string
  /** Rouge pour les actions destructrices, couleur principale sinon */
  variant?: 'primary' | 'danger'
  isLoading?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modale de confirmation réutilisable.
 *
 * Remplace le confirm() natif du navigateur, qui ne respectait pas la charte
 * (et que l'on ne peut ni styler, ni accompagner d'un indicateur d'attente —
 * gênant pour une duplication de projet qui peut prendre plusieurs secondes).
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  loadingLabel,
  variant = 'primary',
  isLoading = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div style={styles.overlay} onClick={isLoading ? undefined : onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>✕</button>
        </div>

        <p style={styles.message}>{message}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={isLoading}>
            Annuler
          </button>
          <button
            type="button"
            style={{
              ...styles.confirmBtn,
              background: variant === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'default' : 'pointer',
            }}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (loadingLabel ?? 'Traitement…') : confirmLabel}
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
  },
  modal: {
    background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 460,
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
    padding: 'var(--space-6)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)',
  },
  title: {
    fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1.3,
  },
  message: {
    fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-2)',
  },
  cancelBtn: {
    background: '#ffffff',
    border: '1px solid var(--color-border, #d1d5db)',
    color: 'var(--color-text, #374151)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '8px 18px',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmBtn: {
    border: 'none',
    color: '#ffffff',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '8px 18px',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
  },
}
