/**
 * Moteur de calculs financiers — port TypeScript du fichier HTML.
 * Toutes les valeurs monétaires sont en Ariary (entiers).
 * Les calculs se font 100% côté client, jamais stockés en base sauf snapshot.
 */

import type {
  CompanySettings,
  Product,
  Material,
  StaffMember,
  Expense,
  Investment,
  AdditionalFunding,
  InflationFactors,
  IncomeStatement,
  CashFlowStatement,
  DepreciationTable,
  LoanRepaymentTable,
  Profitability,
} from '@/types'

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/** Arrondi à l'entier (Ariary = pas de décimales) */
export const round = (n: number) => Math.round(n)

/** Formattage monétaire Ariary */
export const formatAriary = (n: number): string =>
  new Intl.NumberFormat('fr-MG', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(round(n)) + ' Ar'

/** Formattage pourcentage */
export const formatPct = (n: number, decimals = 1): string =>
  `${n.toFixed(decimals)} %`

// ─── Inflation ────────────────────────────────────────────────────────────────

/**
 * Calcule les facteurs d'inflation cumulatifs pour les années 1-5.
 * L'inflation An 1 est toujours 1.0 (base).
 * An 2 = 1 + infl2/100, An 3 = An 2 × (1 + infl3/100), etc.
 */
export function buildInflationFactors(settings: CompanySettings): InflationFactors {
  const f2 = 1 + (settings.infl2 ?? 0) / 100
  const f3 = f2 * (1 + (settings.infl3 ?? 0) / 100)
  const f4 = f3 * (1 + (settings.infl4 ?? 0) / 100)
  const f5 = f4 * (1 + (settings.infl5 ?? 0) / 100)
  return { year1: 1, year2: f2, year3: f3, year4: f4, year5: f5 }
}

export function inflationArray(factors: InflationFactors): number[] {
  return [factors.year1, factors.year2, factors.year3, factors.year4, factors.year5]
}

// ─── Chiffre d'affaires ───────────────────────────────────────────────────────

/**
 * Revenu annuel d'un produit pour l'année `yearIndex` (0-based = An 1).
 * CA de base = somme sur les 12 mois de (prix du mois × quantité du mois) — prix mensuel,
 * variation saisonnière possible.
 * CA An N = CA de base × growthRate cumulatif (la croissance ne s'applique qu'à la quantité ;
 * le profil des 12 prix mensuels se répète à l'identique chaque année).
 */
export function productRevenueByYear(
  product: Product,
  yearIndex: number,
): number {
  const baseRevenue = product.monthlyQty.reduce(
    (sum, qty, m) => sum + qty * (product.monthlyPrice[m] ?? 0),
    0,
  )
  // growthRates[0] = taux croissance An 2 vs An 1, etc.
  let qtyFactor = 1
  for (let y = 0; y < yearIndex; y++) {
    qtyFactor *= 1 + (product.growthRates[y] ?? 0) / 100
  }
  return round(baseRevenue * qtyFactor)
}

export function totalRevenueByYear(products: Product[]): number[] {
  return Array.from({ length: 5 }, (_, y) =>
    products.reduce((sum, p) => sum + productRevenueByYear(p, y), 0),
  )
}

// ─── Coût des matières premières ─────────────────────────────────────────────

export function materialCostByYear(material: Material, yearIndex: number): number {
  const baseCost = material.monthlyQty.reduce(
    (sum, qty, m) => sum + qty * (material.monthlyUnitCost[m] ?? 0),
    0,
  )
  // growthRates[0] = taux croissance An 2 vs An 1, etc.
  let qtyFactor = 1
  for (let y = 0; y < yearIndex; y++) {
    qtyFactor *= 1 + (material.growthRates[y] ?? 0) / 100
  }
  return round(baseCost * qtyFactor)
}

export function totalMaterialCostByYear(materials: Material[]): number[] {
  return Array.from({ length: 5 }, (_, y) =>
    materials.reduce((sum, m) => sum + materialCostByYear(m, y), 0),
  )
}

// ─── Charges de personnel ─────────────────────────────────────────────────────

export function staffAnnualCost(staff: StaffMember): number {
  return round(staff.monthlySalary * staff.headcount * 12 * (1 + staff.chargesRate / 100))
}

/**
 * Coût annuel d'un poste pour l'année `yearIndex` (0-based = An 1).
 * growthRates[0] = hausse salariale An 2 vs An 1 (taux individuel par poste).
 * Coût = base × ∏(1 + growthRate[y]).
 */
export function staffAnnualCostByYear(
  staff: StaffMember,
  yearIndex: number,
): number {
  const base = staffAnnualCost(staff)
  let factor = 1
  for (let y = 0; y < yearIndex; y++) {
    factor *= 1 + ((staff.growthRates?.[y] ?? 0) / 100)
  }
  return round(base * factor)
}

/**
 * Masse salariale totale par année — croissance individuelle par poste.
 */
export function totalStaffCostByYear(staffMembers: StaffMember[]): number[] {
  return Array.from({ length: 5 }, (_, y) =>
    staffMembers.reduce((sum, s) => sum + staffAnnualCostByYear(s, y), 0),
  )
}

// ─── Charges d'exploitation ───────────────────────────────────────────────────

export function expenseAnnualTotal(expense: Expense): number {
  const total = expense.seasonality.reduce(
    (sum, coef, m) => sum + coef * (expense.monthlyAmounts[m] ?? 0),
    0,
  )
  return round(total)
}

/**
 * Total annuel d'une charge pour l'année `yearIndex` (0-based = An 1).
 * inflationGrowth[y] = taux de croissance individuel de la charge pour An y+2.
 */
export function expenseTotalByYear(expense: Expense, yearIndex: number): number {
  let factor = 1
  for (let y = 0; y < yearIndex; y++) {
    factor *= 1 + (expense.inflationGrowth[y] ?? 0) / 100
  }
  return round(expenseAnnualTotal(expense) * factor)
}

export function totalExpensesByYear(expenses: Expense[]): number[] {
  return Array.from({ length: 5 }, (_, y) =>
    expenses.reduce((sum, e) => sum + expenseTotalByYear(e, y), 0),
  )
}

// ─── Amortissements ───────────────────────────────────────────────────────────

export function buildDepreciationTable(investments: Investment[]): DepreciationTable {
  const byInvestment = investments.map((inv) => {
    const annualDepreciation = inv.usefulLife > 0 ? inv.amount / inv.usefulLife : 0
    const yearlyBook = Array.from({ length: 5 }, (_, y) => {
      const remaining = inv.amount - annualDepreciation * (y + 1)
      return Math.max(0, round(remaining))
    })
    return {
      investmentId: inv.id,
      annualDepreciation: round(annualDepreciation),
      yearlyBook,
    }
  })

  const totalAnnualDepreciation = byInvestment.reduce(
    (sum, i) => sum + i.annualDepreciation,
    0,
  )

  return { byInvestment, totalAnnualDepreciation }
}

// ─── Tableau d'amortissement d'emprunt ───────────────────────────────────────

interface LoanPayment {
  capital: number
  interest: number
  balance: number
}

function computeLoanSchedule(
  principal: number,
  annualRatePct: number,
  years: number,
): LoanPayment[] {
  if (principal <= 0 || annualRatePct <= 0 || years <= 0) {
    return Array.from({ length: Math.max(years, 5) }, () => ({
      capital: 0,
      interest: 0,
      balance: 0,
    }))
  }

  const r = annualRatePct / 100
  // Annuité constante (emprunt à remboursement annuel constant, méthode française)
  const annuity = (principal * r * Math.pow(1 + r, years)) / (Math.pow(1 + r, years) - 1)

  let balance = principal
  const schedule: LoanPayment[] = []

  for (let y = 0; y < Math.max(years, 5); y++) {
    if (y >= years || balance <= 0) {
      schedule.push({ capital: 0, interest: 0, balance: 0 })
    } else {
      const interest = round(balance * r)
      const capital = round(annuity - interest)
      balance = Math.max(0, round(balance - capital))
      schedule.push({ capital, interest, balance })
    }
  }

  return schedule
}

export function buildLoanRepaymentTable(
  investments: Investment[],
  additionalFundings?: AdditionalFunding[],
): LoanRepaymentTable {
  // Emprunts liés aux investissements (démarrent en An 1)
  const fromInvestments = investments
    .filter((inv) => inv.financedLoan > 0)
    .map((inv) => ({
      label: inv.name,
      principal: inv.financedLoan,
      rate: inv.loanRate,
      years: inv.loanYears,
      annualPayments: computeLoanSchedule(inv.financedLoan, inv.loanRate, inv.loanYears),
    }))

  // Emprunts des apports complémentaires — démarrent à l'année yearNumber
  // On décale le tableau de remboursement de (yearNumber - 1) années
  const fromFundings = (additionalFundings ?? [])
    .filter((af) => af.loan > 0 && af.loanRate > 0 && af.loanYears > 0)
    .map((af) => {
      const offset = af.yearNumber - 1 // An 1 → offset 0, An 2 → offset 1, etc.
      const schedule = computeLoanSchedule(af.loan, af.loanRate, af.loanYears)
      // Insérer des années vides avant le démarrage de l'emprunt
      const annualPayments = [
        ...Array.from({ length: offset }, () => ({ capital: 0, interest: 0, balance: 0 })),
        ...schedule,
      ].slice(0, 5) // garder 5 ans max
      return {
        label: `Emprunt complémentaire An ${af.yearNumber}`,
        principal: af.loan,
        rate: af.loanRate,
        years: af.loanYears,
        annualPayments,
      }
    })

  const byLoan = [...fromInvestments, ...fromFundings]

  const totalInterestByYear = Array.from({ length: 5 }, (_, y) =>
    byLoan.reduce((sum, l) => sum + (l.annualPayments[y]?.interest ?? 0), 0),
  )

  const totalCapitalByYear = Array.from({ length: 5 }, (_, y) =>
    byLoan.reduce((sum, l) => sum + (l.annualPayments[y]?.capital ?? 0), 0),
  )

  return { byLoan, totalInterestByYear, totalCapitalByYear }
}

// ─── Compte de résultat ───────────────────────────────────────────────────────

export function buildIncomeStatement(
  products: Product[],
  materials: Material[],
  staffMembers: StaffMember[],
  expenses: Expense[],
  investments: Investment[],
  settings: CompanySettings,
  loanTable?: LoanRepaymentTable,
): IncomeStatement {
  const revenueByYear = totalRevenueByYear(products)
  const materialCostByYear = totalMaterialCostByYear(materials)
  const grossMarginByYear = revenueByYear.map((r, y) => r - materialCostByYear[y])
  const staffCostByYear = totalStaffCostByYear(staffMembers)
  const expenseCostByYear = totalExpensesByYear(expenses)
  const ebitdaByYear = grossMarginByYear.map(
    (gm, y) => gm - staffCostByYear[y] - expenseCostByYear[y],
  )

  const depTable = buildDepreciationTable(investments)
  // Amortissement réel par année : s'arrête quand la VNC atteint 0
  const depreciationByYear = Array.from({ length: 5 }, (_, y) =>
    depTable.byInvestment.reduce((sum, row, i) => {
      const inv = investments[i]
      const prevBook = y === 0 ? inv.amount : row.yearlyBook[y - 1]
      const currBook = row.yearlyBook[y]
      return sum + Math.max(0, prevBook - currBook)
    }, 0),
  )

  const ebitByYear = ebitdaByYear.map((e, y) => e - depreciationByYear[y])

  // Utiliser le tableau déjà calculé si fourni, sinon recalculer
  const { totalInterestByYear } = loanTable ?? buildLoanRepaymentTable(investments, [])
  const interestByYear = totalInterestByYear

  const ebtByYear = ebitByYear.map((e, y) => e - interestByYear[y])

  // Impôt selon le régime fiscal
  // IS = CA × Taux IS (assiette sur le chiffre d'affaires)
  const taxByYear = ebtByYear.map((ebt, y) => {
    if (settings.taxRegime === 'IS') {
      return round(revenueByYear[y] * (settings.taxRateIs / 100))
    }
    if (ebt <= 0) return 0
    return round(ebt * (settings.taxRate / 100))
  })

  const netIncomeByYear = ebtByYear.map((ebt, y) => ebt - taxByYear[y])

  return {
    revenueByYear,
    materialCostByYear,
    grossMarginByYear,
    staffCostByYear,
    expenseCostByYear,
    ebitdaByYear,
    depreciationByYear,
    ebitByYear,
    interestByYear,
    ebtByYear,
    taxByYear,
    netIncomeByYear,
  }
}

// ─── Tableau de flux de trésorerie ────────────────────────────────────────────

export function buildCashFlowStatement(
  incomeStatement: IncomeStatement,
  investments: Investment[],
  additionalFundings: AdditionalFunding[],
  loanTable: LoanRepaymentTable,
  settings: CompanySettings,
): CashFlowStatement {
  const { netIncomeByYear, depreciationByYear } = incomeStatement

  // Flux opérationnel = résultat net + amortissements - variation BFR
  // FDR = fondsRoulement initial (trésorerie de départ, ne réduit pas le flux opérationnel)
  const bfr = settings.fondsRoulement ?? 0
  // CAF = résultat net + amortissements (pas de déduction BFR ici — géré dans tresoInitiale)
  const operatingCashFlowByYear = netIncomeByYear.map(
    (net, y) => net + depreciationByYear[y],
  )

  // Flux d'investissement (An 1 seulement pour l'instant — pas de CAPEX récurrent)
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0)
  const investmentByYear = [totalInvestment, 0, 0, 0, 0]

  // Financement initial (An 1)
  const totalEquityY1 =
    investments.reduce((sum, i) => sum + i.financedEquity, 0) +
    (additionalFundings.find((f) => f.yearNumber === 1)?.equity ?? 0)
  const totalLoanY1 =
    investments.reduce((sum, i) => sum + i.financedLoan, 0) +
    (additionalFundings.find((f) => f.yearNumber === 1)?.loan ?? 0)
  const totalGrantY1 =
    investments.reduce((sum, i) => sum + i.financedGrant, 0) +
    (additionalFundings.find((f) => f.yearNumber === 1)?.grant ?? 0)

  // Apports complémentaires An 2-5
  const equityByYear = Array.from({ length: 5 }, (_, y) => {
    if (y === 0) return totalEquityY1
    return additionalFundings.find((f) => f.yearNumber === y + 1)?.equity ?? 0
  })

  const loanByYear = Array.from({ length: 5 }, (_, y) => {
    if (y === 0) return totalLoanY1
    const af = additionalFundings.find((f) => f.yearNumber === y + 1)
    return af ? af.loan : 0
  })

  const grantByYear = Array.from({ length: 5 }, (_, y) => {
    if (y === 0) return totalGrantY1
    return additionalFundings.find((f) => f.yearNumber === y + 1)?.grant ?? 0
  })

  const loanRepaymentByYear = loanTable.totalCapitalByYear

  const netCashByYear = operatingCashFlowByYear.map(
    (op, y) =>
      op - investmentByYear[y] + equityByYear[y] + loanByYear[y] + grantByYear[y] - loanRepaymentByYear[y],
  )

  // La trésorerie cumulative démarre depuis le fonds de roulement initial (An 0)
  // pour être cohérente avec CashFlowSection : tresoInitiale = equity+loan+grant-invest+fdr
  const cumulativeCashByYear = netCashByYear.reduce<number[]>((acc, val, y) => {
    acc.push((y === 0 ? bfr : (acc[y - 1] ?? 0)) + val)
    return acc
  }, [])

  return {
    netIncomeByYear,
    depreciationByYear,
    operatingCashFlowByYear,
    investmentByYear,
    equityByYear,
    loanByYear,
    grantByYear,
    loanRepaymentByYear,
    netCashByYear,
    cumulativeCashByYear,
  }
}

// ─── Indicateurs de rentabilité ───────────────────────────────────────────────

/**
 * VAN (Valeur Actuelle Nette) — actualise les flux opérationnels nets.
 * Investissement initial = An 0 (sortie).
 */
export function computeNPV(
  operatingCashFlows: number[],
  initialInvestment: number,
  discountRatePct: number,
): number {
  const r = discountRatePct / 100
  let npv = -initialInvestment
  operatingCashFlows.forEach((cf, y) => {
    npv += cf / Math.pow(1 + r, y + 1)
  })
  return round(npv)
}

/**
 * TRI (Taux de Rentabilité Interne) — Newton-Raphson, identique à v20.
 * Pas de limite haute sur le taux (TRI peut être > 1000 %).
 * Retourne null uniquement si non convergent ou sans solution.
 */
export function computeIRR(
  operatingCashFlows: number[],
  initialInvestment: number,
): number | null {
  const cashFlows = [-initialInvestment, ...operatingCashFlows]

  // Vérification signe : doit avoir au moins un positif et un négatif
  const hasPositive = cashFlows.some((cf) => cf > 0)
  const hasNegative = cashFlows.some((cf) => cf < 0)
  if (!hasPositive || !hasNegative) return null

  let rate = 0.1
  for (let iter = 0; iter < 200; iter++) {
    let npv = 0
    let dnpv = 0
    cashFlows.forEach((cf, t) => {
      const disc = Math.pow(1 + rate, t)
      npv  += cf / disc
      dnpv -= (t * cf) / (disc * (1 + rate))
    })
    const denom = Math.abs(dnpv) < 1e-9 ? 1e-9 : dnpv
    const newRate = rate - npv / denom
    if (!isFinite(newRate)) return null
    if (Math.abs(newRate - rate) < 1e-7) return Math.round(newRate * 10000) / 100
    // Seule limite : éviter les logs indéfinis (rate = -1 singularité)
    if (newRate < -0.999) return null
    rate = newRate
  }
  // Retourner la meilleure approximation après 200 itérations
  return Math.round(rate * 10000) / 100
}

/**
 * Indice de profitabilité = VAN / Investissement initial + 1
 */
export function computeProfitabilityIndex(npv: number, initialInvestment: number): number {
  if (initialInvestment === 0) return 0
  return Math.round(((npv + initialInvestment) / initialInvestment) * 100) / 100
}

/**
 * Retour sur investissement en années (payback sur flux cumulatifs).
 */
export function computePayback(
  operatingCashFlows: number[],
  initialInvestment: number,
): number | null {
  let cumulative = -initialInvestment
  for (let y = 0; y < operatingCashFlows.length; y++) {
    cumulative += operatingCashFlows[y]
    if (cumulative >= 0) return y + 1
  }
  return null
}

/**
 * Année du seuil de rentabilité (breakeven) — première année où résultat net > 0.
 */
export function computeBreakEvenYear(netIncomeByYear: number[]): number | null {
  for (let y = 0; y < netIncomeByYear.length; y++) {
    if (netIncomeByYear[y] > 0) return y + 1
  }
  return null
}

/**
 * Rentabilité FINANCIÈRE (point de vue actionnaire) :
 *   I₀ = Fonds propres amortis uniquement
 *   Flux = CAF − remboursement capital (net après service de la dette)
 */
export function buildProfitability(
  cashFlow: CashFlowStatement,
  investments: Investment[],
  settings: CompanySettings,
): Profitability {
  const initialInvestment = investments.reduce((sum, i) => sum + i.financedEquity, 0)

  const { operatingCashFlowByYear, loanRepaymentByYear, netIncomeByYear } = cashFlow
  const opCashFlows = operatingCashFlowByYear.map(
    (caf, y) => caf - loanRepaymentByYear[y],
  )

  const npv = computeNPV(opCashFlows, initialInvestment, settings.discountRate)
  const irr = computeIRR(opCashFlows, initialInvestment)
  const profitabilityIndex = computeProfitabilityIndex(npv, initialInvestment)
  const paybackYear = computePayback(opCashFlows, initialInvestment)
  const breakEvenYear = computeBreakEvenYear(netIncomeByYear)

  return { npv, irr, profitabilityIndex, paybackYear, breakEvenYear }
}

/**
 * Rentabilité ÉCONOMIQUE (point de vue projet) :
 *   I₀ = Total investissement amorti (coût total, tous financements confondus)
 *   Flux = CAF brute (avant remboursement emprunt) — le projet doit couvrir sa dette lui-même
 */
export function buildEconomicProfitability(
  cashFlow: CashFlowStatement,
  investments: Investment[],
  settings: CompanySettings,
): Profitability {
  const initialInvestment = investments.reduce((sum, i) => sum + i.amount, 0)

  const { operatingCashFlowByYear, netIncomeByYear } = cashFlow
  // Flux bruts : la CAF générée par le projet (avant service de la dette)
  const opCashFlows = [...operatingCashFlowByYear]

  const npv = computeNPV(opCashFlows, initialInvestment, settings.discountRate)
  const irr = computeIRR(opCashFlows, initialInvestment)
  const profitabilityIndex = computeProfitabilityIndex(npv, initialInvestment)
  const paybackYear = computePayback(opCashFlows, initialInvestment)
  const breakEvenYear = computeBreakEvenYear(netIncomeByYear)

  return { npv, irr, profitabilityIndex, paybackYear, breakEvenYear }
}

// ─── Bilan prévisionnel ───────────────────────────────────────────────────────

export interface BalanceSheet {
  // ACTIF
  fixedAssetsGross: number        // Immobilisations brutes (constant)
  accumulatedDepreciationByYear: number[]  // Amortissements cumulés An 1-5
  fixedAssetsNetByYear: number[]  // VNC = brut - amort cumulé
  bfr: number                    // BFR (constant après An 1)
  cashByYear: number[]           // Trésorerie = cumulativeCash
  totalAssetsByYear: number[]    // TOTAL ACTIF

  // PASSIF
  initialCapital: number         // Capital social initial (constant)
  cumulativeReservesByYear: number[] // Réserves = cumul résultats antérieurs
  netIncomeByYear: number[]      // Résultat de l'exercice
  loanBalanceByYear: number[]    // Emprunt restant dû
  totalLiabilitiesByYear: number[] // TOTAL PASSIF
}

export function buildBalanceSheet(
  investments: Investment[],
  depreciationTable: DepreciationTable,
  loanRepaymentTable: LoanRepaymentTable,
  cashFlow: CashFlowStatement,
  incomeStatement: IncomeStatement,
  settings: CompanySettings,
): BalanceSheet {
  const fixedAssetsGross = investments.reduce((s, i) => s + i.amount, 0)

  // VNC par année = somme des yearlyBook de chaque investissement
  // yearlyBook s'arrête à 0 une fois l'investissement totalement amorti
  const fixedAssetsNetByYear = Array.from({ length: 5 }, (_, y) =>
    depreciationTable.byInvestment.reduce((sum, row) => sum + (row.yearlyBook[y] ?? 0), 0),
  )
  const accumulatedDepreciationByYear = fixedAssetsNetByYear.map(
    (vnc) => Math.max(0, fixedAssetsGross - vnc),
  )

  const bfr = settings.fondsRoulement ?? 0
  const cashByYear = cashFlow.cumulativeCashByYear

  const totalAssetsByYear = fixedAssetsNetByYear.map(
    (net, y) => net + bfr + Math.max(0, cashByYear[y]),
  )

  // Capital = somme des fonds propres apportés (investissements + apports An 1-5)
  const initialCapital = cashFlow.equityByYear.reduce((s, v) => s + v, 0)

  // Réserves = résultats cumulés des années précédentes
  const cumulativeReservesByYear = incomeStatement.netIncomeByYear.reduce<number[]>(
    (acc, _net, y) => {
      acc.push(y === 0 ? 0 : (acc[y - 1] ?? 0) + incomeStatement.netIncomeByYear[y - 1])
      return acc
    },
    [],
  )

  // Emprunt restant dû = somme des balances de fin d'année
  const loanBalanceByYear = Array.from({ length: 5 }, (_, y) =>
    loanRepaymentTable.byLoan.reduce(
      (sum, loan) => sum + (loan.annualPayments[y]?.balance ?? 0),
      0,
    ),
  )

  const totalLiabilitiesByYear = Array.from({ length: 5 }, (_, y) =>
    initialCapital +
    cumulativeReservesByYear[y] +
    incomeStatement.netIncomeByYear[y] +
    loanBalanceByYear[y],
  )

  return {
    fixedAssetsGross,
    accumulatedDepreciationByYear,
    fixedAssetsNetByYear,
    bfr,
    cashByYear,
    totalAssetsByYear,
    initialCapital,
    cumulativeReservesByYear,
    netIncomeByYear: incomeStatement.netIncomeByYear,
    loanBalanceByYear,
    totalLiabilitiesByYear,
  }
}

// ─── Plan de financement ──────────────────────────────────────────────────────

export interface FinancingPlan {
  // RESSOURCES
  cafByYear: number[]            // CAF = résultat net + amortissements
  equityByYear: number[]         // Fonds propres apportés
  loanByYear: number[]           // Emprunts contractés
  grantByYear: number[]          // Subventions
  totalResourcesByYear: number[] // Total ressources

  // EMPLOIS
  investmentByYear: number[]     // Investissements (An 1 uniquement)
  loanRepaymentByYear: number[]  // Remboursements capital
  bfrByYear: number[]            // Variation BFR (An 1 uniquement)
  totalUsesByYear: number[]      // Total emplois

  // SOLDE
  balanceByYear: number[]        // Ressources - Emplois
  cumulativeBalanceByYear: number[] // Solde cumulé
}

export function buildFinancingPlan(
  incomeStatement: IncomeStatement,
  cashFlow: CashFlowStatement,
  settings: CompanySettings,
): FinancingPlan {
  const cafByYear = incomeStatement.netIncomeByYear.map(
    (net, y) => net + incomeStatement.depreciationByYear[y],
  )

  const bfr = settings.fondsRoulement ?? 0
  const bfrByYear = [bfr, 0, 0, 0, 0]

  const totalResourcesByYear = cafByYear.map(
    (caf, y) =>
      caf +
      cashFlow.equityByYear[y] +
      cashFlow.loanByYear[y] +
      cashFlow.grantByYear[y],
  )

  const totalUsesByYear = cashFlow.investmentByYear.map(
    (inv, y) => inv + cashFlow.loanRepaymentByYear[y] + bfrByYear[y],
  )

  const balanceByYear = totalResourcesByYear.map((r, y) => r - totalUsesByYear[y])

  const cumulativeBalanceByYear = balanceByYear.reduce<number[]>((acc, val, y) => {
    acc.push((acc[y - 1] ?? 0) + val)
    return acc
  }, [])

  return {
    cafByYear,
    equityByYear: cashFlow.equityByYear,
    loanByYear: cashFlow.loanByYear,
    grantByYear: cashFlow.grantByYear,
    totalResourcesByYear,
    investmentByYear: cashFlow.investmentByYear,
    loanRepaymentByYear: cashFlow.loanRepaymentByYear,
    bfrByYear,
    totalUsesByYear,
    balanceByYear,
    cumulativeBalanceByYear,
  }
}

// ─── Ratios de rentabilité détaillés ─────────────────────────────────────────

export interface ProfitabilityRatios {
  grossMarginPctByYear: number[]   // Marge brute %
  ebitdaMarginPctByYear: number[]  // EBITDA margin %
  netMarginPctByYear: number[]     // Marge nette %
  breakEvenValueByYear: number[]   // Seuil de rentabilité en Ariary
  breakEvenMonthByYear: number[]   // Point mort en mois
}

export function buildProfitabilityRatios(
  incomeStatement: IncomeStatement,
): ProfitabilityRatios {
  const safeDiv = (a: number, b: number) => (b !== 0 ? round((a / b) * 100) / 100 : 0)

  const grossMarginPctByYear = incomeStatement.revenueByYear.map((r, y) =>
    safeDiv(incomeStatement.grossMarginByYear[y], r) * 100,
  )
  const ebitdaMarginPctByYear = incomeStatement.revenueByYear.map((r, y) =>
    safeDiv(incomeStatement.ebitdaByYear[y], r) * 100,
  )
  const netMarginPctByYear = incomeStatement.revenueByYear.map((r, y) =>
    safeDiv(incomeStatement.netIncomeByYear[y], r) * 100,
  )

  // Seuil de rentabilité = Charges fixes / (1 - Charges variables / CA)
  const breakEvenValueByYear = incomeStatement.revenueByYear.map((rev, y) => {
    const varCosts = incomeStatement.materialCostByYear[y]
    const fixedCosts =
      incomeStatement.staffCostByYear[y] +
      incomeStatement.expenseCostByYear[y] +
      incomeStatement.depreciationByYear[y] +
      incomeStatement.interestByYear[y]
    if (rev === 0) return 0
    const varRate = varCosts / rev
    if (varRate >= 1) return 0
    return round(fixedCosts / (1 - varRate))
  })

  // Point mort en mois = seuil / CA × 12
  const breakEvenMonthByYear = breakEvenValueByYear.map((sr, y) => {
    const rev = incomeStatement.revenueByYear[y]
    if (rev === 0) return 12
    return Math.min(12, Math.ceil((sr / rev) * 12))
  })

  return {
    grossMarginPctByYear,
    ebitdaMarginPctByYear,
    netMarginPctByYear,
    breakEvenValueByYear,
    breakEvenMonthByYear,
  }
}

// ─── Point d'entrée unique ────────────────────────────────────────────────────

export interface FullCalculationResult {
  incomeStatement: IncomeStatement
  depreciationTable: DepreciationTable
  loanRepaymentTable: LoanRepaymentTable
  cashFlowStatement: CashFlowStatement
  /** Rentabilité financière : I₀ = fonds propres amortis, flux nets après remboursement */
  profitability: Profitability
  /** Rentabilité économique : I₀ = total investissement amorti, flux CAF bruts */
  economicProfitability: Profitability
  balanceSheet: BalanceSheet
  financingPlan: FinancingPlan
  profitabilityRatios: ProfitabilityRatios
}

/**
 * Lance tous les calculs en une passe à partir des données brutes d'une entreprise.
 * Appelé chaque fois que l'utilisateur modifie une donnée dans l'éditeur.
 */
export function computeAll(
  settings: CompanySettings,
  products: Product[],
  materials: Material[],
  staffMembers: StaffMember[],
  expenses: Expense[],
  investments: Investment[],
  additionalFundings: AdditionalFunding[],
): FullCalculationResult {
  const depreciationTable = buildDepreciationTable(investments)
  const loanRepaymentTable = buildLoanRepaymentTable(investments, additionalFundings)

  // Passer le tableau d'emprunt déjà calculé pour garantir
  // que le compte de résultat utilise exactement les mêmes intérêts
  // que le tableau de remboursement affiché
  const incomeStatement = buildIncomeStatement(
    products,
    materials,
    staffMembers,
    expenses,
    investments,
    settings,
    loanRepaymentTable,
  )

  const cashFlowStatement = buildCashFlowStatement(
    incomeStatement,
    investments,
    additionalFundings,
    loanRepaymentTable,
    settings,
  )

  const profitability = buildProfitability(cashFlowStatement, investments, settings)
  const economicProfitability = buildEconomicProfitability(cashFlowStatement, investments, settings)
  const balanceSheet = buildBalanceSheet(
    investments,
    depreciationTable,
    loanRepaymentTable,
    cashFlowStatement,
    incomeStatement,
    settings,
  )
  const financingPlan = buildFinancingPlan(incomeStatement, cashFlowStatement, settings)
  const profitabilityRatios = buildProfitabilityRatios(incomeStatement)

  return {
    incomeStatement,
    depreciationTable,
    loanRepaymentTable,
    cashFlowStatement,
    profitability,
    economicProfitability,
    balanceSheet,
    financingPlan,
    profitabilityRatios,
  }
}


// ─── Trésorerie mensuelle An 1 ────────────────────────────────────────────────

export interface MonthlyCashFlow {
  encaissements: number[]      // CA mensuel (12 valeurs)
  coutsVariables: number[]     // Coûts variables mensuels
  personnelMensuel: number     // Personnel mensuel (constant)
  autresCharges: number[]      // Charges mensuelles
  impotMensuel: number         // Impôt / 12
  fraisFinanciersMensuel: number  // Intérêts / 12
  rembCapitalMensuel: number   // Remb. capital / 12
  apportMois: number[]         // Apport An 1 en janvier seulement
  soldeMensuel: number[]       // Solde net mensuel
  soldeCumule: number[]        // Solde cumulé depuis tresoInitiale
}

export function buildMonthlyCashFlow(
  products: Product[],
  materials: Material[],
  staffMembers: StaffMember[],
  expenses: Expense[],
  incomeStatement: IncomeStatement,
  loanRepaymentTable: LoanRepaymentTable,
  additionalFundings: AdditionalFunding[],
  tresoInitiale: number,
): MonthlyCashFlow {
  // CA mensuel = somme sur les produits de (prix du mois[m] × qty mensuelle[m])
  const encaissements = Array.from({ length: 12 }, (_, m) =>
    round(products.reduce((sum, p) => sum + (p.monthlyPrice[m] ?? 0) * (p.monthlyQty[m] ?? 0), 0)),
  )

  // Coûts variables mensuels = somme sur les matières de (coût du mois[m] × qty mensuelle[m])
  const coutsVariables = Array.from({ length: 12 }, (_, m) =>
    round(materials.reduce((sum, mat) => sum + (mat.monthlyUnitCost[m] ?? 0) * (mat.monthlyQty[m] ?? 0), 0)),
  )

  // Personnel mensuel brut chargé (identique chaque mois)
  const personnelMensuel = round(
    staffMembers.reduce((sum, s) => sum + s.monthlySalary * s.headcount * (1 + s.chargesRate / 100), 0),
  )

  // Charges d'exploitation mensuelles = somme sur les charges de (montant du mois[m] × quantité/mois)
  const autresCharges = Array.from({ length: 12 }, (_, m) =>
    round(expenses.reduce((sum, e) => sum + (e.monthlyAmounts[m] ?? 0) * (e.seasonality[m] ?? 0), 0)),
  )

  // Frais répartis uniformément sur 12 mois
  const impotMensuel = round(incomeStatement.taxByYear[0] / 12)
  const fraisFinanciersMensuel = round(loanRepaymentTable.totalInterestByYear[0] / 12)
  const rembCapitalMensuel = round(loanRepaymentTable.totalCapitalByYear[0] / 12)

  // Apport complémentaire An 1 : versé en janvier (mois 0)
  const af1 = additionalFundings.find((f) => f.yearNumber === 1)
  const addTotalAn1 = af1 ? af1.equity + af1.loan + af1.grant : 0
  const apportMois = Array.from({ length: 12 }, (_, m) => (m === 0 ? addTotalAn1 : 0))

  // Solde mensuel net
  const soldeMensuel = Array.from({ length: 12 }, (_, m) =>
    encaissements[m]
    - coutsVariables[m]
    - personnelMensuel
    - autresCharges[m]
    - impotMensuel
    - fraisFinanciersMensuel
    - rembCapitalMensuel
    + apportMois[m],
  )

  // Solde cumulé depuis trésorerie initiale
  const soldeCumule: number[] = []
  let running = tresoInitiale
  for (let m = 0; m < 12; m++) {
    running += soldeMensuel[m]
    soldeCumule.push(Math.round(running))
  }

  return {
    encaissements,
    coutsVariables,
    personnelMensuel,
    autresCharges,
    impotMensuel,
    fraisFinanciersMensuel,
    rembCapitalMensuel,
    apportMois,
    soldeMensuel: soldeMensuel.map(Math.round),
    soldeCumule,
  }
}
