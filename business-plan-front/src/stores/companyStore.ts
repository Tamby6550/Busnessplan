import { create } from 'zustand'
import type {
  CompanyFull,
  Product,
  Material,
  StaffMember,
  Expense,
  Investment,
  InvestmentTerrain,
  AdditionalFunding,
  CompanySettings,
} from '@/types'

export type EditorSection =
  | 'entreprise'
  | 'products'
  | 'materials'
  | 'staff'
  | 'expenses'
  | 'investments'
  | 'funding'
  | 'results'
  | 'cashflow'
  | 'balance'
  | 'profitability'
  | 'financing'
  | 'synthese'
  | 'export'

interface CompanyState {
  company: CompanyFull | null
  activeSection: EditorSection
  isSaving: boolean

  // Load / reset
  setCompany: (company: CompanyFull) => void
  resetCompany: () => void

  // Section navigation
  setActiveSection: (section: EditorSection) => void

  // Saving state
  setSaving: (saving: boolean) => void

  // Optimistic local updates (applied after API success)
  updateSettings: (settings: CompanySettings) => void
  updateCompanyMeta: (data: { name: string; secteur: string; promoteur: string }) => void

  addProduct: (product: Product) => void
  updateProduct: (id: number, data: Partial<Product>) => void
  removeProduct: (id: number) => void

  addMaterial: (material: Material) => void
  updateMaterial: (id: number, data: Partial<Material>) => void
  removeMaterial: (id: number) => void

  addStaffMember: (staff: StaffMember) => void
  updateStaffMember: (id: number, data: Partial<StaffMember>) => void
  removeStaffMember: (id: number) => void

  addExpense: (expense: Expense) => void
  updateExpense: (id: number, data: Partial<Expense>) => void
  removeExpense: (id: number) => void

  addInvestment: (investment: Investment) => void
  updateInvestment: (id: number, data: Partial<Investment>) => void
  removeInvestment: (id: number) => void

  addInvestmentTerrain: (investment: InvestmentTerrain) => void
  updateInvestmentTerrain: (id: number, data: Partial<InvestmentTerrain>) => void
  removeInvestmentTerrain: (id: number) => void

  updateAdditionalFundings: (fundings: AdditionalFunding[]) => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  company: null,
  activeSection: 'entreprise',
  isSaving: false,

  setCompany: (company) => set({ company }),
  resetCompany: () => set({ company: null, activeSection: 'entreprise' }),

  setActiveSection: (section) => set({ activeSection: section }),
  setSaving: (saving) => set({ isSaving: saving }),

  updateSettings: (settings) =>
    set((state) => ({
      company: state.company ? { ...state.company, settings } : null,
    })),

  updateCompanyMeta: (data) =>
    set((state) => ({
      company: state.company ? { ...state.company, ...data } : null,
    })),

  // ─── Products ───────────────────────────────────────────────────────────
  addProduct: (product) =>
    set((state) => ({
      // Nouveau produit en tête de liste (cohérent avec le sortOrder attribué côté backend)
      company: state.company
        ? { ...state.company, products: [product, ...state.company.products] }
        : null,
    })),

  updateProduct: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            products: state.company.products.map((p) =>
              p.id === id ? { ...p, ...data } : p,
            ),
          }
        : null,
    })),

  removeProduct: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            products: state.company.products.filter((p) => p.id !== id),
          }
        : null,
    })),

  // ─── Materials ──────────────────────────────────────────────────────────
  addMaterial: (material) =>
    set((state) => ({
      // Nouvelle matière en tête de liste (cohérent avec le sortOrder attribué côté backend)
      company: state.company
        ? { ...state.company, materials: [material, ...state.company.materials] }
        : null,
    })),

  updateMaterial: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            materials: state.company.materials.map((m) =>
              m.id === id ? { ...m, ...data } : m,
            ),
          }
        : null,
    })),

  removeMaterial: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            materials: state.company.materials.filter((m) => m.id !== id),
          }
        : null,
    })),

  // ─── Staff members ──────────────────────────────────────────────────────
  addStaffMember: (staff) =>
    set((state) => ({
      // Nouveau poste en tête de liste (cohérent avec le sortOrder attribué côté backend)
      company: state.company
        ? { ...state.company, staffMembers: [staff, ...state.company.staffMembers] }
        : null,
    })),

  updateStaffMember: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            staffMembers: state.company.staffMembers.map((s) =>
              s.id === id ? { ...s, ...data } : s,
            ),
          }
        : null,
    })),

  removeStaffMember: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            staffMembers: state.company.staffMembers.filter((s) => s.id !== id),
          }
        : null,
    })),

  // ─── Expenses ───────────────────────────────────────────────────────────
  addExpense: (expense) =>
    set((state) => ({
      // Nouvelle charge en tête de liste (cohérent avec le sortOrder attribué côté backend)
      company: state.company
        ? { ...state.company, expenses: [expense, ...state.company.expenses] }
        : null,
    })),

  updateExpense: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            expenses: state.company.expenses.map((e) =>
              e.id === id ? { ...e, ...data } : e,
            ),
          }
        : null,
    })),

  removeExpense: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            expenses: state.company.expenses.filter((e) => e.id !== id),
          }
        : null,
    })),

  // ─── Investments ─────────────────────────────────────────────────────────
  addInvestment: (investment) =>
    set((state) => ({
      // Nouvel investissement en tête de liste (cohérent avec le sortOrder attribué côté backend)
      company: state.company
        ? { ...state.company, investments: [investment, ...state.company.investments] }
        : null,
    })),

  updateInvestment: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            investments: state.company.investments.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
          }
        : null,
    })),

  removeInvestment: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            investments: state.company.investments.filter((i) => i.id !== id),
          }
        : null,
    })),

  // ─── Investissement Terrain (table séparée, pas d'amortissement) ──────────
  addInvestmentTerrain: (investment) =>
    set((state) => ({
      company: state.company
        ? { ...state.company, investmentTerrains: [investment, ...state.company.investmentTerrains] }
        : null,
    })),

  updateInvestmentTerrain: (id, data) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            investmentTerrains: state.company.investmentTerrains.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
          }
        : null,
    })),

  removeInvestmentTerrain: (id) =>
    set((state) => ({
      company: state.company
        ? {
            ...state.company,
            investmentTerrains: state.company.investmentTerrains.filter((i) => i.id !== id),
          }
        : null,
    })),

  // ─── Additional fundings ─────────────────────────────────────────────────
  updateAdditionalFundings: (fundings) =>
    set((state) => ({
      company: state.company
        ? { ...state.company, additionalFundings: fundings }
        : null,
    })),
}))
