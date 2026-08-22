/**
 * Indicateur de statut réseau + synchronisation.
 * Affiché dans la topbar de l'éditeur et du dashboard.
 * N'affiche rien quand tout est synchronisé (mode normal en ligne).
 */
import { useNetworkStore } from '@/stores/networkStore'
import { syncService } from '@/services/syncService'

export default function SyncIndicator() {
  const isOnline       = useNetworkStore((s) => s.isOnline)
  const syncInProgress = useNetworkStore((s) => s.syncInProgress)
  const pendingOps     = useNetworkStore((s) => s.pendingOps)

  // ── Hors ligne ──────────────────────────────────────────────────────────────
  // Cliquable : permet de retenter manuellement (utile si la coupure était réelle
  // côté serveur/Internet sans que le navigateur n'ait déclenché l'event "offline" —
  // dans ce cas l'app ne repasserait jamais en ligne toute seule).
  if (!isOnline) {
    return (
      <button
        style={{ ...styles.pill('#dc2626', '#fef2f2'), cursor: 'pointer', border: 'none' }}
        title="Mode hors-ligne - modifications enregistrées localement. Cliquez pour retenter."
        onClick={() => {
          useNetworkStore.getState().setOnline(true)
          syncService.processSyncQueue()
        }}
      >
        <span style={styles.dot('#dc2626')} />
        <span>Hors ligne</span>
        {pendingOps > 0 && (
          <span style={styles.badge('#dc2626')}>{pendingOps}</span>
        )}
        <i className="fas fa-rotate" style={{ fontSize: 10, marginLeft: 2 }} />
      </button>
    )
  }

  // ── En ligne + synchronisation en cours ────────────────────────────────────
  if (syncInProgress) {
    return (
      <div style={styles.pill('#f5a623', '#fffbeb')} title="Synchronisation en cours…">
        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />
        <span>Sync…</span>
      </div>
    )
  }

  // ── En ligne + opérations en attente ──────────────────────────────────────
  if (pendingOps > 0) {
    return (
      <button
        style={{ ...styles.pill('#f5a623', '#fffbeb'), cursor: 'pointer', border: 'none' }}
        title={`${pendingOps} modification(s) à synchroniser - cliquez pour synchroniser`}
        onClick={() => syncService.processSyncQueue()}
      >
        <span style={styles.dot('#f5a623')} />
        <span>{pendingOps} en attente</span>
        <i className="fas fa-rotate" style={{ fontSize: 10, marginLeft: 2 }} />
      </button>
    )
  }

  // ── En ligne + tout synchronisé → rien à afficher ─────────────────────────
  return null
}

// ── Styles inline ──────────────────────────────────────────────────────────────

const styles = {
  pill: (color: string, bg: string): React.CSSProperties => ({
    display:      'inline-flex',
    alignItems:   'center',
    gap:          5,
    padding:      '3px 10px',
    borderRadius: 20,
    background:   bg,
    color,
    fontSize:     12,
    fontWeight:   600,
    whiteSpace:   'nowrap',
    userSelect:   'none',
  }),
  dot: (color: string): React.CSSProperties => ({
    width:        7,
    height:       7,
    borderRadius: '50%',
    background:   color,
    flexShrink:   0,
  }),
  badge: (color: string): React.CSSProperties => ({
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          18,
    height:         18,
    borderRadius:   '50%',
    background:     color,
    color:          '#fff',
    fontSize:       10,
    fontWeight:     700,
    marginLeft:     2,
  }),
}
