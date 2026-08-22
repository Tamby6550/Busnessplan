/**
 * Base de données locale IndexedDB via Dexie.js
 * Stocke le cache des données serveur et la queue de synchronisation offline.
 */
import Dexie, { type Table } from 'dexie'
import type { CompanyFull, ProjectSummary } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'product'
  | 'material'
  | 'staff'
  | 'expense'
  | 'investment'
  | 'investmentTerrain'
  | 'funding'
  | 'settings'

export interface SyncOp {
  id?: number
  createdAt: number
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  body: unknown
  tempId?: number        // ID temporaire (négatif) assigné localement pour les créations
  entity: EntityType
  companyId: number
  status: 'pending' | 'error'
  errorMessage?: string
  retries: number
}

export interface CachedDashboard {
  id: 1                           // toujours 1 — enregistrement unique
  projects: ProjectSummary[]
  cachedAt: number
}

export interface CachedCompanyFull {
  companyId: number
  data: CompanyFull
  cachedAt: number
}

// ─── Dexie schema ─────────────────────────────────────────────────────────────

class BusinessPlanDB extends Dexie {
  syncQueue!: Table<SyncOp>
  dashboard!: Table<CachedDashboard>
  companyFull!: Table<CachedCompanyFull>

  constructor() {
    super('BusinessPlanAI')
    this.version(1).stores({
      syncQueue:   '++id, createdAt, entity, companyId, status',
      dashboard:   'id',
      companyFull: 'companyId',
    })
  }
}

export const db = new BusinessPlanDB()

// ─── Générateur d'ID temporaire ───────────────────────────────────────────────
// IDs négatifs pour distinguer les entités créées hors-ligne des entités serveur

let _seq = 0
export function generateTempId(): number {
  return -(Date.now() * 10000 + (++_seq % 10000))
}
