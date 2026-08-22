/**
 * Store Zustand pour l'état réseau.
 * Suivi de la connexion internet, de la queue de sync et du statut de synchronisation.
 */
import { create } from 'zustand'

interface NetworkState {
  isOnline: boolean
  syncInProgress: boolean
  // Vrai dès l'instant où la connexion revient, jusqu'à la fin réelle de la synchronisation
  // (englobe le petit délai de stabilisation ET processSyncQueue). Contrairement à
  // `syncInProgress` (qui ne passe à true qu'au tout début de processSyncQueue, quelques
  // centaines de ms après le retour en ligne), `reconnecting` couvre TOUTE la fenêtre —
  // sert à empêcher les pages d'éditeur de recharger le serveur trop tôt et d'écraser
  // les données locales pas encore synchronisées.
  reconnecting: boolean
  pendingOps: number        // nombre d'opérations en attente de sync
  lastSyncAt: number | null // timestamp de la dernière sync réussie

  setOnline: (v: boolean) => void
  setSyncInProgress: (v: boolean) => void
  setReconnecting: (v: boolean) => void
  setPendingOps: (n: number) => void
  setLastSyncAt: (ts: number) => void
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncInProgress: false,
  reconnecting: false,
  pendingOps: 0,
  lastSyncAt: null,

  setOnline:          (v)  => set({ isOnline: v }),
  setSyncInProgress:  (v)  => set({ syncInProgress: v }),
  setReconnecting:    (v)  => set({ reconnecting: v }),
  setPendingOps:      (n)  => set({ pendingOps: n }),
  setLastSyncAt:      (ts) => set({ lastSyncAt: ts }),
}))
