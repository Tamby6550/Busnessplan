// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
  firstName: string
  lastName: string
  fullName: string
  initials: string
  role: import('@/utils/permissions').UserRole
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: number
  name: string
  description: string
  createdBy: UserRef | null
  createdAt: string
  updatedAt: string
  companyCount: number
  companies: CompanySummary[]
}

export interface UserRef {
  id: number
  fullName: string
  initials: string
}

// ─── Company (dashboard list) ─────────────────────────────────────────────────

export interface CompanySummary {
  id: number
  name: string
  secteur: string
  promoteur: string
  descriptionActivite: string | null
  marche: string | null
  genre: 'femme' | 'homme' | null
  modeleEconomique: ('production' | 'service')[] | null
  etatActivite: 'existante' | 'nouvelle' | null
  createdBy: UserRef | null
  lastModifiedBy: UserRef | null
  updatedAt: string
  isValidated: boolean
  validatedAt: string | null
  validatedBy: { id: number; fullName: string } | null
  snapshot: CompanySnapshot | null
}

export interface CompanySnapshot {
  revenueY1: number
  netIncomeY1: number
  cashCumY1: number
  breakEven: number
  completionPct: number
}

// ─── Company (full editor payload) ───────────────────────────────────────────

export interface CompanyFull {
  id: number
  name: string
  secteur: string
  promoteur: string
  descriptionActivite: string | null
  marche: string | null
  genre: 'femme' | 'homme' | null
  modeleEconomique: ('production' | 'service')[] | null
  etatActivite: 'existante' | 'nouvelle' | null
  updatedAt: string
  isValidated: boolean
  validatedAt: string | null
  validatedBy: { id: number; fullName: string } | null
  createdBy: { id: number; fullName: string } | null
  settings: CompanySettings | null
  products: Product[]
  materials: Material[]
  staffMembers: StaffMember[]
  expenses: Expense[]
  investments: Investment[]
  investmentTerrains: InvestmentTerrain[]
  additionalFundings: AdditionalFunding[]
  snapshot: CompanySnapshot | null
}

export interface CompanySettings {
  infl2: number
  infl3: number
  infl4: number
  infl5: number
  discountRate: number
  taxRegime: 'IR' | 'IS'
  taxRate: number
  taxRateIs: number
  fondsRoulement: number
}

// ─── Line items ───────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  monthlyPrice: number[] // 12 values — Ariary, prix par mois (variation saisonnière possible)
  monthlyQty: number[]   // 12 values
  growthRates: number[]  // 5 values (An 1-5 %)
  sortOrder: number
}

export interface Material {
  id: number
  name: string
  monthlyUnitCost: number[] // 12 values — Ariary, coût par mois (variation saisonnière possible)
  monthlyQty: number[]      // 12 values (décimales autorisées)
  growthRates: number[]     // 5 values
  sortOrder: number
}

export interface StaffMember {
  id: number
  roleName: string
  monthlySalary: number  // BIGINT — Ariary
  headcount: number
  chargesRate: number    // % ex: 13
  growthRates: number[]  // 4 valeurs : taux croissance An 2, An 3, An 4, An 5 (%)
  sortOrder: number
}

export interface Expense {
  id: number
  name: string
  monthlyAmounts: number[]  // 12 values — Ariary, montant par mois (peut varier selon le mois)
  seasonality: number[]     // 12 values — quantité / coefficient par mois (1 = présent, 0 = absent)
  inflationGrowth: number[] // 5 values
  sortOrder: number
}

export interface Investment {
  id: number
  name: string
  amount: number         // BIGINT
  usefulLife: number     // years
  equipmentType: 'electrique' | 'non_electrique' | null  // informatif
  financedEquity: number
  // Nature de l'apport en fonds propres :
  // 'nature'    = apport en nature (bien déjà possédé) → financedEquity = 100% de amount, pas de subvention/emprunt
  // 'financier' = apport en espèces → pourcentage libre de 0 à 99%, le reste financé par subvention/emprunt
  contributionType: 'nature' | 'financier'
  financedLoan: number
  financedGrant: number
  loanRate: number       // % annuel
  loanYears: number
  sortOrder: number
}

// Investissement Terrain — table séparée de l'investissement général.
// Pas de durée d'amortissement (jamais amorti) et pas de plan de financement
// (fonds propres / subvention / emprunt) : aucun lien avec la trésorerie.
export interface InvestmentTerrain {
  id: number
  name: string
  amount: number         // BIGINT
  sortOrder: number
}

export interface AdditionalFunding {
  yearNumber: number     // 1-5
  equity: number
  loan: number
  loanRate: number
  loanYears: number
  grant: number
}

// ─── Activity log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number
  section: string
  action: string
  entityType: string | null
  entityId: number | null
  fieldName: string | null
  oldValue: string | null
  newValue: string | null
  user: UserRef | null
  createdAt: string
}

// ─── Financial calculation outputs ───────────────────────────────────────────

export interface InflationFactors {
  year1: number  // 1.0 (base)
  year2: number
  year3: number
  year4: number
  year5: number
}

export interface RevenueTable {
  byProduct: { productId: number; annualRevenue: number[] }[]  // [Y1..Y5]
  totalByYear: number[]  // [Y1..Y5]
}

export interface MaterialCostTable {
  byMaterial: { materialId: number; annualCost: number[] }[]
  totalByYear: number[]
}

export interface StaffCostTable {
  byStaff: { staffId: number; annualCost: number[] }[]
  totalByYear: number[]
}

export interface ExpenseCostTable {
  byExpense: { expenseId: number; annualTotal: number[] }[]
  totalByYear: number[]
}

export interface DepreciationTable {
  byInvestment: {
    investmentId: number
    annualDepreciation: number
    yearlyBook: number[]  // book value at end of each year
  }[]
  totalAnnualDepreciation: number
}

export interface LoanRepaymentTable {
  byLoan: {
    label: string
    principal: number
    rate: number
    years: number
    annualPayments: { capital: number; interest: number; balance: number }[]
  }[]
  totalInterestByYear: number[]
  totalCapitalByYear: number[]
}

export interface IncomeStatement {
  revenueByYear: number[]
  materialCostByYear: number[]
  grossMarginByYear: number[]
  staffCostByYear: number[]
  expenseCostByYear: number[]
  ebitdaByYear: number[]
  depreciationByYear: number[]
  ebitByYear: number[]
  interestByYear: number[]
  ebtByYear: number[]
  taxByYear: number[]
  netIncomeByYear: number[]
}

export interface CashFlowStatement {
  netIncomeByYear: number[]
  depreciationByYear: number[]
  operatingCashFlowByYear: number[]
  investmentByYear: number[]
  equityByYear: number[]
  loanByYear: number[]
  grantByYear: number[]
  loanRepaymentByYear: number[]
  netCashByYear: number[]
  cumulativeCashByYear: number[]
}

export interface Profitability {
  npv: number
  irr: number | null
  profitabilityIndex: number
  paybackYear: number | null
  breakEvenYear: number | null
}
