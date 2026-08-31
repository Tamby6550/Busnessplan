import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { safeRole } from '@/utils/permissions'
import { exportDashboardToExcel } from '@/utils/dashboardExport'
import type { ProjectSummary } from '@/types'

interface Props {
  project: ProjectSummary
  projectId: number
  projectName: string
  onClose: () => void
}

export default function ExportLinkModal({ project, projectId, projectName, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const role = safeRole(user?.role)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const url = `${window.location.origin}/api/export/dashboard.xlsx?project=${projectId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Repli si l'API Clipboard n'est pas disponible (navigateur ancien, contexte non sécurisé…)
      const input = document.getElementById('export-link-input') as HTMLInputElement | null
      input?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload() {
    // Génération 100% côté navigateur (comme avant l'ajout du lien Power Query) :
    // évite complètement la limite de 60s de PHP côté hébergement LWS, puisque
    // le fichier est construit ici avec les données déjà chargées par l'app.
    setDownloading(true)
    try {
      const { skipped } = await exportDashboardToExcel([project], user?.id, role, undefined, projectName)
      if (skipped.length > 0) {
        alert(
          "Export terminé, mais certaines entreprises ont été ignorées :\n" +
          skipped.map((s) => `- ${s.name} (${s.reason})`).join('\n'),
        )
      }
    } catch {
      alert("Le téléchargement a échoué. Vérifie ta connexion et réessaie.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Lien d'export - {projectName}</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        <p style={styles.hint}>
          Ce lien génère à la demande le fichier Excel complet de ce projet. Utilise-le dans Power
          Query (« Données → À partir du Web », authentification « De base » avec ton
          e-mail BP et ton mot de passe BP)
        </p>

        <div style={styles.linkRow}>
          <input
            id="export-link-input"
            className="form-input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            style={styles.input}
          />
        </div>

        <div style={styles.footer}>
          <button className="btn btn-secondary" onClick={handleCopy}>
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 6 }} />
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Téléchargement…
              </>
            ) : (
              <>
                <i className="fas fa-download" style={{ marginRight: 6 }} />
                Télécharger
              </>
            )}
          </button>
        </div>
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
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560,
    display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
    padding: 'var(--space-6)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 'var(--text-lg)', fontWeight: 700 },
  hint: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 },
  linkRow: { display: 'flex', gap: 'var(--space-2)' },
  input: { flex: 1, fontFamily: 'monospace', fontSize: 'var(--text-sm)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' },
}
