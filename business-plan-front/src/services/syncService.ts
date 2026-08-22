/**
 * Service de synchronisation offline ↔ serveur.
 *
 * Responsabilités :
 *  - Mettre en cache les données serveur dans IndexedDB
 *  - Enregistrer les opérations hors-ligne dans la queue
 *  - Rejouer la queue quand la connexion revient
 *  - Résoudre les IDs temporaires (négatifs) vers les vrais IDs serveur
 */
import { db, type SyncOp, type EntityType } from '@/db/localDb'
import { useNetworkStore } from '@/stores/networkStore'
import { useAuthStore } from '@/stores/authStore'
import type { CompanyFull, ProjectSummary } from '@/types'

const BASE_URL = '/api'

// ─── Requête brute vers le serveur (sans offline-check) ───────────────────────

async function rawFetch(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}`)
  return json
}

// ─── Helpers cache ────────────────────────────────────────────────────────────

const entityArrayKey: Record<string, keyof CompanyFull> = {
  product:    'products',
  material:   'materials',
  staff:      'staffMembers',
  expense:    'expenses',
  investment: 'investments',
  investmentTerrain: 'investmentTerrains',
  funding:    'additionalFundings',
}

// ─── Service principal ────────────────────────────────────────────────────────

export const syncService = {

  // ── Persistance du cache ─────────────────────────────────────────────────

  async saveDashboardCache(projects: ProjectSummary[]) {
    await db.dashboard.put({ id: 1, projects, cachedAt: Date.now() })
  },

  async loadDashboardCache(): Promise<ProjectSummary[] | null> {
    const cached = await db.dashboard.get(1)
    return cached?.projects ?? null
  },

  async saveCompanyCache(data: CompanyFull) {
    await db.companyFull.put({ companyId: data.id, data, cachedAt: Date.now() })
  },

  async loadCompanyCache(companyId: number): Promise<CompanyFull | null> {
    const cached = await db.companyFull.get(companyId)
    return cached?.data ?? null
  },

  // ── Mise à jour d'une entreprise dans le cache ──────────────────────────

  async patchCompanyCache(
    companyId: number,
    updater: (data: CompanyFull) => CompanyFull,
  ) {
    const cached = await db.companyFull.get(companyId)
    if (!cached) return
    const updated = updater(structuredClone(cached.data))
    await db.companyFull.put({ ...cached, data: updated, cachedAt: Date.now() })
  },

  // ── Enqueue une opération offline ───────────────────────────────────────

  async enqueue(
    op: Omit<SyncOp, 'id' | 'createdAt' | 'status' | 'retries'>,
  ): Promise<void> {
    await db.syncQueue.add({
      ...op,
      createdAt: Date.now(),
      status: 'pending',
      retries: 0,
    })
    await this._refreshCount()
  },

  async _refreshCount() {
    const n = await db.syncQueue.where('status').equals('pending').count()
    useNetworkStore.getState().setPendingOps(n)
  },

  // ── Traitement de la queue quand on revient en ligne ─────────────────────

  async processSyncQueue(): Promise<{ synced: number; errors: number }> {
    const ns = useNetworkStore.getState()
    if (ns.syncInProgress) return { synced: 0, errors: 0 }

    ns.setSyncInProgress(true)
    let synced = 0
    let errors = 0

    try {
      const pending = await db.syncQueue
        .where('status').equals('pending')
        .sortBy('createdAt')

      if (pending.length === 0) {
        ns.setLastSyncAt(Date.now())
        return { synced: 0, errors: 0 }
      }

      // Table de remapping : tempId (négatif) → ID réel serveur
      const idMap = new Map<number, number>()

      for (const op of pending) {
        try {
          // Remap des IDs temporaires dans le chemin URL
          let path = op.path
          for (const [tmp, real] of idMap) {
            path = path.split(`/${tmp}`).join(`/${real}`)
          }

          // Remap des IDs temporaires dans le corps
          let body = op.body
          if (body && idMap.size > 0) {
            let json = JSON.stringify(body)
            for (const [tmp, real] of idMap) {
              json = json.split(String(tmp)).join(String(real))
            }
            body = JSON.parse(json)
          }

          const result = await rawFetch(op.method, path, body ?? undefined)

          // Si c'était une création → capturer le vrai ID
          if (op.method === 'POST' && op.tempId != null && result && typeof result === 'object') {
            const realId = (result as { id?: number }).id
            if (realId && op.tempId < 0) {
              idMap.set(op.tempId, realId)
              // Remplacer le tempId dans le cache local
              await this.patchCompanyCache(op.companyId, (data) => {
                const key = entityArrayKey[op.entity]
                if (key && Array.isArray(data[key])) {
                  const arr = data[key] as Array<{ id: number }>
                  const item = arr.find((x) => x.id === op.tempId)
                  if (item) item.id = realId
                }
                return data
              })
            }
          }

          await db.syncQueue.delete(op.id!)
          synced++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await db.syncQueue.update(op.id!, {
            status: 'error',
            errorMessage: msg,
            retries: (op.retries ?? 0) + 1,
          })
          errors++
        }
      }

      ns.setLastSyncAt(Date.now())
    } finally {
      ns.setSyncInProgress(false)
      await this._refreshCount()
    }

    return { synced, errors }
  },

  // ── Réessayer les opérations en erreur ───────────────────────────────────

  async retryErrors() {
    await db.syncQueue
      .where('status').equals('error')
      .modify({ status: 'pending', errorMessage: undefined })
    await this._refreshCount()
    return this.processSyncQueue()
  },

  // ── Initialisation (appelée au démarrage de l'app) ───────────────────────

  init(): () => void {
    // Compte initial des opérations en attente
    this._refreshCount()

    const handleOnline = async () => {
      // `reconnecting` passe à true de façon SYNCHRONE, avant même `setOnline(true)` —
      // ça bloque immédiatement tout rechargement prématuré des pages d'éditeur (qui
      // surveillent `isOnline`), le temps que les modifications hors-ligne en attente
      // arrivent bien sur le serveur en premier. Sans ça, il y a une fenêtre de ~800ms
      // où `isOnline` est déjà true mais `syncInProgress` pas encore, pendant laquelle
      // une page pouvait recharger de vieilles données serveur et écraser la saisie
      // locale pas encore synchronisée.
      const ns = useNetworkStore.getState()
      ns.setReconnecting(true)
      ns.setOnline(true)
      try {
        // Petit délai pour que la connexion se stabilise
        await new Promise((r) => setTimeout(r, 800))
        await this.processSyncQueue()
      } finally {
        ns.setReconnecting(false)
      }
    }

    const handleOffline = () => {
      useNetworkStore.getState().setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },

  // ── Helpers pour offlineApi ──────────────────────────────────────────────

  /** Ajoute une entité dans le cache local (pour les créations offline) */
  async addEntityToCache<T extends { id: number }>(
    companyId: number,
    entity: EntityType,
    item: T,
  ) {
    await this.patchCompanyCache(companyId, (data) => {
      const key = entityArrayKey[entity]
      if (key && Array.isArray(data[key])) {
        ;(data[key] as T[]).push(item)
      }
      return data
    })
  },

  /** Met à jour une entité dans le cache local */
  async updateEntityInCache<T extends { id: number }>(
    companyId: number,
    entity: EntityType,
    id: number,
    patch: Partial<T>,
  ) {
    await this.patchCompanyCache(companyId, (data) => {
      const key = entityArrayKey[entity]
      if (key && Array.isArray(data[key])) {
        const arr = data[key] as T[]
        const idx = arr.findIndex((x) => x.id === id)
        if (idx !== -1) arr[idx] = { ...arr[idx], ...patch }
      }
      return data
    })
  },

  /** Supprime une entité du cache local */
  async removeEntityFromCache(
    companyId: number,
    entity: EntityType,
    id: number,
  ) {
    await this.patchCompanyCache(companyId, (data) => {
      const key = entityArrayKey[entity]
      if (key && Array.isArray(data[key])) {
        const arr = data[key] as Array<{ id: number }>
        ;(data[key] as typeof arr) = arr.filter((x) => x.id !== id)
      }
      return data
    })
  },
}
