
import {
  productApi,
  materialApi,
  staffMemberApi,
  expenseApi,
  investmentApi,
  investmentTerrainApi,
  additionalFundingApi,
  companyApi,
  ApiError,
} from '@/api/api'
import { syncService } from '@/services/syncService'
import { useNetworkStore } from '@/stores/networkStore'
import { generateTempId } from '@/db/localDb'
import type {
  Product,
  Material,
  StaffMember,
  Expense,
  Investment,
  InvestmentTerrain,
  AdditionalFunding,
  CompanySettings,
} from '@/types'

//  Helper 

function isOnline(): boolean {
  return useNetworkStore.getState().isOnline
}

/**
 * Exécute `onlineAction` si l'app pense être en ligne. Si l'appel réseau échoue
 * réellement (fetch rejeté — pas une réponse d'erreur du serveur, une vraie coupure),
 * on corrige l'état réseau (qui mentait) et on bascule sur `offlineAction`, pour ne
 * jamais perdre la saisie de l'utilisateur. Une vraie erreur serveur (ApiError — ex:
 * validation, session expirée) n'est PAS masquée : elle doit remonter telle quelle.
 */
async function withOfflineFallback<T>(
  onlineAction: () => Promise<T>,
  offlineAction: () => Promise<T>,
): Promise<T> {
  if (isOnline()) {
    try {
      return await onlineAction()
    } catch (err) {
      if (err instanceof ApiError) throw err
      // Échec réseau réel (le serveur n'a pas répondu) alors que l'app pensait
      // être en ligne : on corrige l'état et on sauvegarde en local à la place.
      useNetworkStore.getState().setOnline(false)
      return offlineAction()
    }
  }
  return offlineAction()
}

// Valeurs par défaut pour les entités créées hors-ligne
const DEFAULTS = {
  product: {
    monthlyPrice: Array<number>(12).fill(0),
    monthlyQty: Array<number>(12).fill(0),
    growthRates: Array<number>(5).fill(0),
    sortOrder: 0,
  } satisfies Omit<Product, 'id' | 'name'>,

  material: {
    monthlyUnitCost: Array<number>(12).fill(0),
    monthlyQty: Array<number>(12).fill(0),
    growthRates: Array<number>(5).fill(0),
    sortOrder: 0,
  } satisfies Omit<Material, 'id' | 'name'>,

  staff: {
    monthlySalary: 0,
    headcount: 1,
    chargesRate: 13,
    growthRates: Array<number>(4).fill(0),
    sortOrder: 0,
  } satisfies Omit<StaffMember, 'id' | 'roleName'>,

  expense: {
    monthlyAmounts: Array<number>(12).fill(0),
    seasonality: Array<number>(12).fill(1),
    inflationGrowth: Array<number>(5).fill(0),
    sortOrder: 0,
  } satisfies Omit<Expense, 'id' | 'name'>,

  investment: {
    amount: 0,
    usefulLife: 5,
    equipmentType: null,
    financedEquity: 0,
    contributionType: 'financier',
    financedLoan: 0,
    financedGrant: 0,
    loanRate: 0,
    loanYears: 5,
    sortOrder: 0,
  } satisfies Omit<Investment, 'id' | 'name'>,

  investmentTerrain: {
    amount: 0,
    natureType: 'physique',
    sortOrder: 0,
  } satisfies Omit<InvestmentTerrain, 'id' | 'name'>,
}

// ─── Produits ─────────────────────────────────────────────────────────────────

export const offlineProductApi = {
  async create(
    companyId: number,
    data: { name: string; monthlyPrice?: number[]; monthlyQty?: number[]; growthRates?: number[] },
  ): Promise<Product> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const product = await productApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'product', product)
        return product
      },
      async () => {
        const product: Product = { ...DEFAULTS.product, ...data, id }
        await syncService.addEntityToCache(companyId, 'product', product)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/products`,
          body: data,
          tempId: id,
          entity: 'product',
          companyId,
        })
        return product
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<Product>): Promise<Product> {
    return withOfflineFallback(
      async () => {
        const product = await productApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'product', id, product)
        return product
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'product', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.products.find((p) => p.id === id)
        const updated: Product = { ...(found ?? { id, ...DEFAULTS.product, name: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/products/${id}`,
          body: data,
          entity: 'product',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'product', id)
    await withOfflineFallback(
      () => productApi.delete(id),
      async () => {
        // Ne pas queuer les suppressions d'entités jamais synchronisées (ID négatif)
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/products/${id}`,
            body: null,
            entity: 'product',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Matières premières ───────────────────────────────────────────────────────

export const offlineMaterialApi = {
  async create(
    companyId: number,
    data: { name: string; monthlyUnitCost?: number[]; monthlyQty?: number[]; growthRates?: number[] },
  ): Promise<Material> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const mat = await materialApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'material', mat)
        return mat
      },
      async () => {
        const mat: Material = { ...DEFAULTS.material, ...data, id }
        await syncService.addEntityToCache(companyId, 'material', mat)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/materials`,
          body: data,
          tempId: id,
          entity: 'material',
          companyId,
        })
        return mat
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<Material>): Promise<Material> {
    return withOfflineFallback(
      async () => {
        const mat = await materialApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'material', id, mat)
        return mat
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'material', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.materials.find((m) => m.id === id)
        const updated: Material = { ...(found ?? { id, ...DEFAULTS.material, name: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/materials/${id}`,
          body: data,
          entity: 'material',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'material', id)
    await withOfflineFallback(
      () => materialApi.delete(id),
      async () => {
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/materials/${id}`,
            body: null,
            entity: 'material',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Personnel ────────────────────────────────────────────────────────────────

export const offlineStaffApi = {
  async create(
    companyId: number,
    data: { roleName: string; monthlySalary?: number; headcount?: number; chargesRate?: number },
  ): Promise<StaffMember> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const staff = await staffMemberApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'staff', staff)
        return staff
      },
      async () => {
        const staff: StaffMember = { ...DEFAULTS.staff, ...data, id }
        await syncService.addEntityToCache(companyId, 'staff', staff)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/staff-members`,
          body: data,
          tempId: id,
          entity: 'staff',
          companyId,
        })
        return staff
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<StaffMember>): Promise<StaffMember> {
    return withOfflineFallback(
      async () => {
        const staff = await staffMemberApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'staff', id, staff)
        return staff
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'staff', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.staffMembers.find((s) => s.id === id)
        const updated: StaffMember = { ...(found ?? { id, ...DEFAULTS.staff, roleName: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/staff-members/${id}`,
          body: data,
          entity: 'staff',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'staff', id)
    await withOfflineFallback(
      () => staffMemberApi.delete(id),
      async () => {
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/staff-members/${id}`,
            body: null,
            entity: 'staff',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Charges ──────────────────────────────────────────────────────────────────

export const offlineExpenseApi = {
  async create(
    companyId: number,
    data: { name: string; monthlyAmounts?: number[]; seasonality?: number[]; inflationGrowth?: number[] },
  ): Promise<Expense> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const exp = await expenseApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'expense', exp)
        return exp
      },
      async () => {
        const exp: Expense = { ...DEFAULTS.expense, ...data, id }
        await syncService.addEntityToCache(companyId, 'expense', exp)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/expenses`,
          body: data,
          tempId: id,
          entity: 'expense',
          companyId,
        })
        return exp
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<Expense>): Promise<Expense> {
    return withOfflineFallback(
      async () => {
        const exp = await expenseApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'expense', id, exp)
        return exp
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'expense', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.expenses.find((e) => e.id === id)
        const updated: Expense = { ...(found ?? { id, ...DEFAULTS.expense, name: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/expenses/${id}`,
          body: data,
          entity: 'expense',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'expense', id)
    await withOfflineFallback(
      () => expenseApi.delete(id),
      async () => {
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/expenses/${id}`,
            body: null,
            entity: 'expense',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Investissements ──────────────────────────────────────────────────────────

export const offlineInvestmentApi = {
  async create(
    companyId: number,
    data: { name: string; amount?: number; usefulLife?: number; financedEquity?: number; financedLoan?: number; financedGrant?: number; loanRate?: number; loanYears?: number },
  ): Promise<Investment> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const inv = await investmentApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'investment', inv)
        return inv
      },
      async () => {
        const inv: Investment = { ...DEFAULTS.investment, ...data, id }
        await syncService.addEntityToCache(companyId, 'investment', inv)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/investments`,
          body: data,
          tempId: id,
          entity: 'investment',
          companyId,
        })
        return inv
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<Investment>): Promise<Investment> {
    return withOfflineFallback(
      async () => {
        const inv = await investmentApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'investment', id, inv)
        return inv
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'investment', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.investments.find((i) => i.id === id)
        const updated: Investment = { ...(found ?? { id, ...DEFAULTS.investment, name: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/investments/${id}`,
          body: data,
          entity: 'investment',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'investment', id)
    await withOfflineFallback(
      () => investmentApi.delete(id),
      async () => {
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/investments/${id}`,
            body: null,
            entity: 'investment',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Investissement Terrain (table séparée, pas de durée d'amortissement) ─────

export const offlineInvestmentTerrainApi = {
  async create(
    companyId: number,
    data: { name: string; amount?: number },
  ): Promise<InvestmentTerrain> {
    const id = generateTempId()
    return withOfflineFallback(
      async () => {
        const inv = await investmentTerrainApi.create(companyId, data)
        await syncService.addEntityToCache(companyId, 'investmentTerrain', inv)
        return inv
      },
      async () => {
        const inv: InvestmentTerrain = { ...DEFAULTS.investmentTerrain, ...data, id }
        await syncService.addEntityToCache(companyId, 'investmentTerrain', inv)
        await syncService.enqueue({
          method: 'POST',
          path: `/companies/${companyId}/investment-terrains`,
          body: data,
          tempId: id,
          entity: 'investmentTerrain',
          companyId,
        })
        return inv
      },
    )
  },

  async update(id: number, companyId: number, data: Partial<InvestmentTerrain>): Promise<InvestmentTerrain> {
    return withOfflineFallback(
      async () => {
        const inv = await investmentTerrainApi.update(id, data)
        await syncService.updateEntityInCache(companyId, 'investmentTerrain', id, inv)
        return inv
      },
      async () => {
        await syncService.updateEntityInCache(companyId, 'investmentTerrain', id, data)
        const cached = await syncService.loadCompanyCache(companyId)
        const found = cached?.investmentTerrains.find((i) => i.id === id)
        const updated: InvestmentTerrain = { ...(found ?? { id, ...DEFAULTS.investmentTerrain, name: '' }), ...data }
        await syncService.enqueue({
          method: 'PATCH',
          path: `/investment-terrains/${id}`,
          body: data,
          entity: 'investmentTerrain',
          companyId,
        })
        return updated
      },
    )
  },

  async delete(id: number, companyId: number): Promise<void> {
    await syncService.removeEntityFromCache(companyId, 'investmentTerrain', id)
    await withOfflineFallback(
      () => investmentTerrainApi.delete(id),
      async () => {
        if (id > 0) {
          await syncService.enqueue({
            method: 'DELETE',
            path: `/investment-terrains/${id}`,
            body: null,
            entity: 'investmentTerrain',
            companyId,
          })
        }
      },
    )
  },
}

// ─── Apports complémentaires ──────────────────────────────────────────────────

export const offlineFundingApi = {
  async update(companyId: number, data: AdditionalFunding[]): Promise<AdditionalFunding[]> {
    return withOfflineFallback(
      async () => {
        const result = await additionalFundingApi.update(companyId, data)
        await syncService.patchCompanyCache(companyId, (c) => {
          c.additionalFundings = result
          return c
        })
        return result
      },
      async () => {
        await syncService.patchCompanyCache(companyId, (c) => {
          c.additionalFundings = data
          return c
        })
        await syncService.enqueue({
          method: 'PUT',
          path: `/companies/${companyId}/additional-fundings`,
          body: data,
          entity: 'funding',
          companyId,
        })
        return data
      },
    )
  },
}

// ─── Informations entreprise ──────────────────────────────────────────────────

export const offlineCompanyApi = {
  async updateMeta(
    companyId: number,
    data: {
      name: string
      secteur: string
      promoteur: string
      descriptionActivite: string | null
      marche: string | null
      genre: 'femme' | 'homme' | null
      modeleEconomique: ('production' | 'service')[] | null
      etatActivite: 'existante' | 'nouvelle' | null
    },
  ): Promise<typeof data> {
    const applyToCache = (c: import('@/types').CompanyFull) => {
      c.name = data.name
      c.secteur = data.secteur
      c.promoteur = data.promoteur
      c.descriptionActivite = data.descriptionActivite
      c.marche = data.marche
      c.genre = data.genre
      c.modeleEconomique = data.modeleEconomique
      c.etatActivite = data.etatActivite
      return c
    }
    return withOfflineFallback(
      async () => {
        const result = await companyApi.updateMeta(companyId, data)
        await syncService.patchCompanyCache(companyId, applyToCache)
        return result as unknown as typeof data
      },
      async () => {
        await syncService.patchCompanyCache(companyId, applyToCache)
        await syncService.enqueue({
          method: 'PATCH',
          path: `/companies/${companyId}/meta`,
          body: data,
          entity: 'settings',
          companyId,
        })
        return data
      },
    )
  },
}

// ─── Paramètres ───────────────────────────────────────────────────────────────

export const offlineSettingsApi = {
  async update(companyId: number, data: CompanySettings): Promise<CompanySettings> {
    return withOfflineFallback(
      async () => {
        const result = await companyApi.updateSettings(companyId, data)
        await syncService.patchCompanyCache(companyId, (c) => {
          c.settings = result
          return c
        })
        return result
      },
      async () => {
        await syncService.patchCompanyCache(companyId, (c) => {
          c.settings = data
          return c
        })
        await syncService.enqueue({
          method: 'PATCH',
          path: `/companies/${companyId}/settings`,
          body: data,
          entity: 'settings',
          companyId,
        })
        const cached = await syncService.loadCompanyCache(companyId)
        return (cached?.settings ?? data) as CompanySettings
      },
    )
  },
}
