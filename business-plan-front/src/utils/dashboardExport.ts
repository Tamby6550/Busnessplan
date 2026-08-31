import type { ProjectSummary, CompanySummary, CompanyFull, CompanySettings } from '@/types'
import { canSeeAll, type UserRole } from './permissions'
import { companyApi } from '@/api/api'
import { syncService } from '@/services/syncService'
import {
  computeAll,
  productRevenueByYear,
  materialCostByYear,
  staffAnnualCostByYear,
  expenseTotalByYear,
  type FullCalculationResult,
} from '@/calculations/calculations'
// @ts-ignore
import XLSXStyle from 'xlsx-js-style'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const C = {
  darkBg:    '1E2433',
  primary:   '3A7D2E',
  white:     'FFFFFF',
  textDark:  '1A1A1A',
  border:    'E2E8F0',
  danger:    'DC2626',
  dangerLt:  'FEF2F2',
  success:   '16A34A',
  lightGray: 'F8FAFC',
}

function allBorder() {
  const side = { style: 'thin', color: { rgb: C.border } }
  return { top: side, bottom: side, left: side, right: side }
}

function hdr(text: string): object {
  return { v: text, t: 's', s: {
    font: { bold: true, sz: 10, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.darkBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: allBorder(),
  }}
}

function lbl(text: string, bold = false, bg?: string): object {
  return { v: text, t: 's', s: {
    font: { bold, sz: 10, color: { rgb: C.textDark } },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: allBorder(),
  }}
}

function lblC(text: string, bold = false, bg?: string): object {
  return { v: text, t: 's', s: {
    font: { bold, sz: 10, color: { rgb: C.textDark } },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: allBorder(),
  }}
}

function num(value: number, colored = false, fmt = '#,##0'): object {
  const color = colored ? (value >= 0 ? C.success : C.danger) : C.textDark
  return { v: value, t: 'n', z: fmt, s: {
    font: { sz: 10, color: { rgb: color } },
    fill: { fgColor: { rgb: C.white } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: allBorder(),
  }}
}

function numC(value: number, fmt = '#,##0'): object {
  return { v: value, t: 'n', z: fmt, s: {
    font: { sz: 10, color: { rgb: C.textDark } },
    fill: { fgColor: { rgb: C.white } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorder(),
  }}
}

function pctCell(value: number): object {
  return { v: value, t: 'n', z: '0.0"%"', s: {
    font: { sz: 10, color: { rgb: C.textDark } },
    fill: { fgColor: { rgb: C.white } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorder(),
  }}
}

function setRow(ws: Record<string, unknown>, row: object[], rowIdx: number) {
  row.forEach((cell, col) => {
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: col })] = cell
  })
}

function normalize(v: string | null | undefined): string {
  return v && v.trim() !== '' ? v.trim() : '(Non renseigné)'
}

type Merge = { s: { r: number; c: number }; e: { r: number; c: number } }


function buildSheet(headers: string[], rows: object[][], colWidths?: number[], merges?: Merge[]): Record<string, unknown> {
  const ws: Record<string, unknown> = {}
  let r = 0
  setRow(ws, headers.map((h) => hdr(h)), r++)
  rows.forEach((row) => setRow(ws, row, r++))
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(r - 1, 0), c: headers.length - 1 } })
  if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wpx: w }))
  if (merges && merges.length) ws['!merges'] = merges
  return ws
}

const DEFAULT_SETTINGS: CompanySettings = {
  infl2: 0, infl3: 0, infl4: 0, infl5: 0,
  discountRate: 0, taxRegime: 'IR', taxRate: 0, taxRateIs: 0, fondsRoulement: 0,
}

function monthHeaders(prefix: string): string[] {
  return MONTHS.map((m) => `${prefix} ${m}`)
}

function yearHeaders(prefix: string, labels: string[] = YEARS): string[] {
  return labels.map((y) => `${prefix} ${y}`)
}

function monthCols(values: number[]): object[] {
  return MONTHS.map((_, i) => numC(values[i] ?? 0))
}

function yearCols(values: number[], labels: string[] = YEARS): object[] {
  return labels.map((_, i) => numC(values[i] ?? 0))
}

function sanitizeFilename(s: string): string {
  const cleaned = s.replace(/[\\/:*?"<>|]/g, '_').trim().replace(/\s+/g, '_')
  return cleaned.slice(0, 60) || 'Export'
}

function buildLongFormatRows<T>(
  contexts: CompanyContext[],
  getItems: (ctx: CompanyContext) => T[],
  buildRow: (item: T, ctx: CompanyContext) => object[],
  totalStartCol: number,
  totalColCount: number,
): { rows: object[][]; merges: Merge[] } {
  const rows: object[][] = []
  const merges: Merge[] = []
  let r = 1 // la ligne 0 est l'en-tête
  for (const ctx of contexts) {
    const items = getItems(ctx)
    if (items.length === 0) continue
    const startRow = r
    items.forEach((item) => {
      rows.push(buildRow(item, ctx))
      r++
    })
    const endRow = r - 1
    if (endRow > startRow && totalColCount > 0) {
      for (let c = 0; c < totalColCount; c++) {
        merges.push({ s: { r: startRow, c: totalStartCol + c }, e: { r: endRow, c: totalStartCol + c } })
      }
    }
  }
  return { rows, merges }
}

interface CompanyContext {
  projectName: string
  company: CompanySummary
  full: CompanyFull
  result: FullCalculationResult
}

interface BuildResult {
  contexts: CompanyContext[]
  skipped: { name: string; reason: string }[]
}


async function loadAllContexts(
  projects: ProjectSummary[],
  currentUserId: number | undefined,
  role: UserRole,
  onProgress?: (done: number, total: number) => void,
): Promise<BuildResult> {
  const seeAll = canSeeAll(role)

  const targets: { projectName: string; company: CompanySummary }[] = []
  for (const project of projects) {
    for (const company of project.companies) {
      const visible = seeAll || (company.createdBy?.id === currentUserId && !company.isValidated)
      if (visible) targets.push({ projectName: project.name, company })
    }
  }

  const contexts: CompanyContext[] = []
  const skipped: { name: string; reason: string }[] = []

  let done = 0
  for (const { projectName, company } of targets) {
    let full: CompanyFull | null = null
    try {
      full = await companyApi.get(company.id)
    } catch {
      full = await syncService.loadCompanyCache(company.id)
    }
    done++
    onProgress?.(done, targets.length)

    if (!full) {
      skipped.push({ name: company.name, reason: 'Impossible de charger le détail (hors-ligne, non mis en cache)' })
      continue
    }
    if (!full.settings) {
      skipped.push({ name: company.name, reason: 'Paramètres financiers non configurés' })
      continue
    }

    try {
      const result = computeAll(
        full.settings ?? DEFAULT_SETTINGS,
        full.products, full.materials, full.staffMembers, full.expenses,
        full.investments, full.additionalFundings,
      )
      contexts.push({ projectName, company, full, result })
    } catch {
      skipped.push({ name: company.name, reason: 'Erreur de calcul' })
    }
  }

  contexts.sort((a, b) => normalize(a.company.promoteur).localeCompare(normalize(b.company.promoteur), 'fr'))

  return { contexts, skipped }
}


function buildRecapSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'Promoteur', 'Entreprise', 'Projet', 'Secteur', 'Genre', 'Modèle économique', 'État activité', 'Statut',
    'Créé par', 'Modifié par', 'Dernière modification',
    'Régime fiscal', 'Taux imposition (%)', 'Fonds de roulement (%)',
    'CA An 1 (Ar)', 'CA An 5 (Ar)', 'Résultat net An 1 (Ar)', 'Résultat net An 5 (Ar)',
    'Trésorerie cumulée An 1 (Ar)', 'Trésorerie cumulée An 5 (Ar)',
    'Total investissement (Ar)', 'Total fonds propres (Ar)', 'Total subvention (Ar)', 'Total emprunt (Ar)',
  ]

  const rows = contexts.map(({ projectName, company, full, result }) => {
    const inv = full.investments
    const totalInvest = inv.reduce((s, i) => s + i.amount, 0)
    const totalEquity = inv.reduce((s, i) => s + i.financedEquity, 0)
    const totalGrant  = inv.reduce((s, i) => s + i.financedGrant, 0)
    const totalLoan   = inv.reduce((s, i) => s + i.financedLoan, 0)
    const modifiedDate = company.updatedAt ? new Date(company.updatedAt).toLocaleDateString('fr-FR') : '-'

    return [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      lbl(projectName),
      lbl(company.secteur ?? '-'),
      lbl(full.genre === 'femme' ? 'Femme' : full.genre === 'homme' ? 'Homme' : '-'),
      lbl((full.modeleEconomique ?? []).join(', ') || '-'),
      lbl(full.etatActivite === 'existante' ? 'Existante' : full.etatActivite === 'nouvelle' ? 'Nouvelle' : '-'),
      lbl(company.isValidated ? 'Validé' : 'En cours', false, company.isValidated ? C.dangerLt : undefined),
      lbl(company.createdBy?.fullName ?? '-'),
      lbl(company.lastModifiedBy?.fullName ?? '-'),
      lbl(modifiedDate),
      lbl(full.settings?.taxRegime ?? '-'),
      num(full.settings?.taxRegime === 'IS' ? (full.settings?.taxRateIs ?? 0) : (full.settings?.taxRate ?? 0)),
      num(full.settings?.fondsRoulement ?? 0),
      num(result.incomeStatement.revenueByYear[0] ?? 0),
      num(result.incomeStatement.revenueByYear[4] ?? 0),
      num(result.incomeStatement.netIncomeByYear[0] ?? 0, true),
      num(result.incomeStatement.netIncomeByYear[4] ?? 0, true),
      num(result.cashFlowStatement.cumulativeCashByYear[0] ?? 0),
      num(result.cashFlowStatement.cumulativeCashByYear[4] ?? 0),
      num(totalInvest),
      num(totalEquity),
      num(totalGrant),
      num(totalLoan),
    ]
  })

  return buildSheet(headers, rows, [
    195, 240, 195, 170, 115, 195, 135, 115, 170, 170, 145,
    125, 135, 160, 145, 145, 160, 160, 180, 180,
    170, 170, 170, 170,
  ])
}

function buildProduitsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'id', 'Promoteur', 'Entreprise', 'Produits (noms)',
    ...monthHeaders('Prix Ar'),
    ...monthHeaders('Qté'),
    ...yearHeaders('Croissance %', YEARS.slice(1)),
    ...yearHeaders("CA Ar"),
    ...YEARS.map((y) => `CA total ${y} (Ar)`),
  ]
  const totalColCount = 5
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.products,
    (p, ctx) => {
      const totalByYear = Array.from({ length: 5 }, (_, y) =>
        ctx.full.products.reduce((s, pp) => s + productRevenueByYear(pp, y), 0),
      )
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(p.name),
        ...monthCols(p.monthlyPrice),
        ...monthCols(p.monthlyQty),
        ...yearCols(p.growthRates, YEARS.slice(1)),
        ...yearCols(Array.from({ length: 5 }, (_, y) => productRevenueByYear(p, y))),
        ...totalByYear.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    70, 195, 240, 220,
    ...Array(12).fill(85), ...Array(12).fill(85),
    ...Array(4).fill(105), ...Array(5).fill(120),
    ...Array(5).fill(140),
  ]
  return buildSheet(headers, rows, widths, merges)
}


function buildMatieresSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'id', 'Promoteur', 'Entreprise', 'Matières (noms)',
    ...monthHeaders('Coût unitaire Ar'),
    ...monthHeaders('Qté'),
    ...yearHeaders('Croissance %', YEARS.slice(1)),
    ...yearHeaders('Coût Ar'),
    ...YEARS.map((y) => `Coût total ${y} (Ar)`),
  ]
  const totalColCount = 5
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.materials,
    (m, ctx) => {
      const totalByYear = Array.from({ length: 5 }, (_, y) =>
        ctx.full.materials.reduce((s, mm) => s + materialCostByYear(mm, y), 0),
      )
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(m.name),
        ...monthCols(m.monthlyUnitCost),
        ...monthCols(m.monthlyQty),
        ...yearCols(m.growthRates, YEARS.slice(1)),
        ...yearCols(Array.from({ length: 5 }, (_, y) => materialCostByYear(m, y))),
        ...totalByYear.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    70, 195, 240, 220,
    ...Array(12).fill(85), ...Array(12).fill(85),
    ...Array(4).fill(105), ...Array(5).fill(120),
    ...Array(5).fill(140),
  ]
  return buildSheet(headers, rows, widths, merges)
}


function buildPersonnelSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'id', 'Promoteur', 'Entreprise', 'Postes (noms)',
    'Salaire mensuel Ar', 'Effectif', 'Taux de charges %',
    ...yearHeaders('Croissance %', YEARS.slice(1)),
    ...yearHeaders('Coût Ar'),
    ...YEARS.map((y) => `Coût total ${y} (Ar)`),
  ]
  const totalColCount = 5
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.staffMembers,
    (s, ctx) => {
      const totalByYear = Array.from({ length: 5 }, (_, y) =>
        ctx.full.staffMembers.reduce((sum, st) => sum + staffAnnualCostByYear(st, y), 0),
      )
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(s.roleName),
        numC(s.monthlySalary),
        numC(s.headcount),
        numC(s.chargesRate),
        ...yearCols(s.growthRates, YEARS.slice(1)),
        ...yearCols(Array.from({ length: 5 }, (_, y) => staffAnnualCostByYear(s, y))),
        ...totalByYear.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    70, 195, 240, 220, 200, 120, 180,
    ...Array(4).fill(110), ...Array(5).fill(120),
    ...Array(5).fill(140),
  ]
  return buildSheet(headers, rows, widths, merges)
}


function buildChargesSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'id', 'Promoteur', 'Entreprise', 'Charges (noms)',
    ...monthHeaders('Montant Ar'),
    ...monthHeaders('Présence'),
    ...yearHeaders('Inflation %', YEARS.slice(1)),
    ...yearHeaders('Total Ar'),
    ...YEARS.map((y) => `Total ${y} (Ar)`),
  ]
  const totalColCount = 5
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.expenses,
    (e, ctx) => {
      const totalByYear = Array.from({ length: 5 }, (_, y) =>
        ctx.full.expenses.reduce((s, ee) => s + expenseTotalByYear(ee, y), 0),
      )
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(e.name),
        ...monthCols(e.monthlyAmounts),
        ...monthCols(e.seasonality),
        ...yearCols(e.inflationGrowth, YEARS.slice(1)),
        ...yearCols(Array.from({ length: 5 }, (_, y) => expenseTotalByYear(e, y))),
        ...totalByYear.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    70, 195, 240, 220,
    ...Array(12).fill(85), ...Array(12).fill(85),
    ...Array(4).fill(105), ...Array(5).fill(120),
    ...Array(5).fill(140),
  ]
  return buildSheet(headers, rows, widths, merges)
}

function buildInvestissementsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'id', 'Promoteur', 'Entreprise', 'Investissements (désignations)',
    'Montant Ar', 'Durée amort. ans', "Type d'équipement", "Type d'apport",
    'Fonds propres (Ar)', 'Fonds propres (%)',
    'Subvention (Ar)', 'Subvention (%)',
    'Emprunt (Ar)', 'Emprunt (%)',
    'Taux emprunt (%)', 'Durée emprunt (ans)',
    'Amortissement annuel Ar', ...yearHeaders('VNC Ar'),
    'Total investissement (Ar)', 'Total fonds propres (Ar)', 'Total subvention (Ar)', 'Total emprunt (Ar)',
    ...YEARS.map((y) => `VNC totale ${y} (Ar)`),
  ]
  const totalColCount = 4 + 5
  const totalStartCol = headers.length - totalColCount

  const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0)

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.investments,
    (it, ctx) => {
      const inv = ctx.full.investments
      const depByInv = new Map(ctx.result.depreciationTable.byInvestment.map((d) => [d.investmentId, d]))
      const totalInvest = inv.reduce((s, i) => s + i.amount, 0)
      const totalEquity = inv.reduce((s, i) => s + i.financedEquity, 0)
      const totalGrant  = inv.reduce((s, i) => s + i.financedGrant, 0)
      const totalLoan   = inv.reduce((s, i) => s + i.financedLoan, 0)
      const vncTotalByYear = Array.from({ length: 5 }, (_, y) =>
        inv.reduce((s, i) => s + (depByInv.get(i.id)?.yearlyBook[y] ?? 0), 0),
      )
      const dep = depByInv.get(it.id)
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(it.name),
        numC(it.amount),
        numC(it.usefulLife),
        lblC(it.equipmentType === 'electrique' ? 'Électrique' : 'Non électrique'),
        lblC(it.contributionType === 'nature' ? 'Apport en nature' : 'Apport financier'),
        numC(it.financedEquity), numC(pct(it.financedEquity, it.amount)),
        numC(it.financedGrant), numC(pct(it.financedGrant, it.amount)),
        numC(it.financedLoan), numC(pct(it.financedLoan, it.amount)),
        numC(it.loanRate), numC(it.loanYears),
        numC(it.usefulLife > 0 ? Math.round(it.amount / it.usefulLife) : 0),
        ...yearCols(Array.from({ length: 5 }, (_, y) => dep?.yearlyBook[y] ?? 0)),
        numC(totalInvest), numC(totalEquity), numC(totalGrant), numC(totalLoan),
        ...vncTotalByYear.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    70, 195, 240, 240,
    150, 160, 180, 200,
    160, 110, 160, 110, 160, 110, 130, 140,
    220, ...Array(5).fill(120),
    150, 150, 150, 150,
    ...Array(5).fill(130),
  ]
  return buildSheet(headers, rows, widths, merges)
}


function buildInvestTerrainSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = ['id', 'Promoteur', 'Entreprise', 'Investissements non amortis (désignations)', 'Nature', 'Montant Ar', 'Total (Ar)']
  const totalColCount = 1
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.full.investmentTerrains,
    (x, ctx) => {
      const total = ctx.full.investmentTerrains.reduce((s, xx) => s + xx.amount, 0)
      return [
        numC(ctx.company.id),
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(x.name),
        lblC(x.natureType === 'immateriel' ? 'Immatériel' : 'Physique'),
        numC(x.amount),
        numC(total),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [70, 195, 240, 280, 120, 170, 150]
  return buildSheet(headers, rows, widths, merges)
}


function buildFinancementsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'Promoteur', 'Entreprise',
    ...yearHeaders('Fonds propres Ar'),
    ...yearHeaders('Emprunt Ar'),
    ...yearHeaders('Taux emprunt %'),
    ...yearHeaders('Durée emprunt ans'),
    ...yearHeaders('Subvention Ar'),
  ]
  const rows = contexts.map(({ company, full }) => {
    const f = full.additionalFundings
    const seriesFor = (getV: (x: (typeof f)[number]) => number) =>
      Array.from({ length: 5 }, (_, y) => {
        const item = f.find((x) => x.yearNumber === y + 1)
        return item ? getV(item) : 0
      })
    return [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      ...yearCols(seriesFor((x) => x.equity)),
      ...yearCols(seriesFor((x) => x.loan)),
      ...yearCols(seriesFor((x) => x.loanRate)),
      ...yearCols(seriesFor((x) => x.loanYears)),
      ...yearCols(seriesFor((x) => x.grant)),
    ]
  })
  return buildSheet(headers, rows, [195, 240, ...Array(25).fill(110)])
}


function pivotSheet(
  contexts: CompanyContext[],
  indicators: { label: string; get: (r: FullCalculationResult) => number[] }[],
): Record<string, unknown> {
  const headers = ['Promoteur', 'Entreprise', ...indicators.flatMap((i) => yearHeaders(i.label))]
  const rows = contexts.map(({ company, result }) => [
    lbl(normalize(company.promoteur), true),
    lbl(company.name),
    ...indicators.flatMap(({ get }) => yearCols(get(result))),
  ])
  const widths = [195, 240, ...indicators.flatMap(() => Array(5).fill(120))]
  return buildSheet(headers, rows, widths)
}

function buildCompteResultatSheet(contexts: CompanyContext[]): Record<string, unknown> {
  return pivotSheet(contexts, [
    { label: "Chiffre d'affaires", get: (r) => r.incomeStatement.revenueByYear },
    { label: 'Coût matières', get: (r) => r.incomeStatement.materialCostByYear },
    { label: 'Marge brute', get: (r) => r.incomeStatement.grossMarginByYear },
    { label: 'Charges de personnel', get: (r) => r.incomeStatement.staffCostByYear },
    { label: 'Autres charges', get: (r) => r.incomeStatement.expenseCostByYear },
    { label: 'EBITDA (EBE)', get: (r) => r.incomeStatement.ebitdaByYear },
    { label: 'Amortissements', get: (r) => r.incomeStatement.depreciationByYear },
    { label: "Résultat d'exploitation (EBIT)", get: (r) => r.incomeStatement.ebitByYear },
    { label: 'Charges financières (intérêts)', get: (r) => r.incomeStatement.interestByYear },
    { label: 'Résultat avant impôt', get: (r) => r.incomeStatement.ebtByYear },
    { label: 'Impôt', get: (r) => r.incomeStatement.taxByYear },
    { label: 'Résultat net', get: (r) => r.incomeStatement.netIncomeByYear },
    { label: 'Marge brute (%)', get: (r) => r.profitabilityRatios.grossMarginPctByYear },
    { label: 'Marge EBITDA (%)', get: (r) => r.profitabilityRatios.ebitdaMarginPctByYear },
    { label: 'Marge nette (%)', get: (r) => r.profitabilityRatios.netMarginPctByYear },
    { label: 'Seuil de rentabilité (Ar)', get: (r) => r.profitabilityRatios.breakEvenValueByYear },
    { label: 'Point mort (mois)', get: (r) => r.profitabilityRatios.breakEvenMonthByYear },
  ])
}

function buildTresorerieSheet(contexts: CompanyContext[]): Record<string, unknown> {
  return pivotSheet(contexts, [
    { label: 'Résultat net', get: (r) => r.cashFlowStatement.netIncomeByYear },
    { label: 'Amortissements', get: (r) => r.cashFlowStatement.depreciationByYear },
    { label: "Flux d'exploitation (CAF)", get: (r) => r.cashFlowStatement.operatingCashFlowByYear },
    { label: 'Investissements', get: (r) => r.cashFlowStatement.investmentByYear },
    { label: 'Fonds propres apportés', get: (r) => r.cashFlowStatement.equityByYear },
    { label: 'Emprunts contractés', get: (r) => r.cashFlowStatement.loanByYear },
    { label: 'Subventions', get: (r) => r.cashFlowStatement.grantByYear },
    { label: 'Remboursement emprunt (capital)', get: (r) => r.cashFlowStatement.loanRepaymentByYear },
    { label: 'Flux net de trésorerie', get: (r) => r.cashFlowStatement.netCashByYear },
    { label: 'Trésorerie cumulée', get: (r) => r.cashFlowStatement.cumulativeCashByYear },
  ])
}

function buildBilanSheet(contexts: CompanyContext[]): Record<string, unknown> {
  return pivotSheet(contexts, [
    { label: 'Immobilisations brutes', get: (r) => Array(5).fill(r.balanceSheet.fixedAssetsGross) },
    { label: 'Amortissements cumulés', get: (r) => r.balanceSheet.accumulatedDepreciationByYear },
    { label: 'Immobilisations nettes (VNC)', get: (r) => r.balanceSheet.fixedAssetsNetByYear },
    { label: 'BFR', get: (r) => Array(5).fill(r.balanceSheet.bfr) },
    { label: 'Trésorerie', get: (r) => r.balanceSheet.cashByYear },
    { label: 'TOTAL ACTIF', get: (r) => r.balanceSheet.totalAssetsByYear },
    { label: 'Capital social initial', get: (r) => Array(5).fill(r.balanceSheet.initialCapital) },
    { label: 'Réserves cumulées', get: (r) => r.balanceSheet.cumulativeReservesByYear },
    { label: "Résultat de l'exercice", get: (r) => r.balanceSheet.netIncomeByYear },
    { label: 'Emprunt restant dû', get: (r) => r.balanceSheet.loanBalanceByYear },
    { label: 'TOTAL PASSIF', get: (r) => r.balanceSheet.totalLiabilitiesByYear },
  ])
}

function buildPlanFinancementSheet(contexts: CompanyContext[]): Record<string, unknown> {
  return pivotSheet(contexts, [
    { label: 'CAF', get: (r) => r.financingPlan.cafByYear },
    { label: 'Fonds propres', get: (r) => r.financingPlan.equityByYear },
    { label: 'Emprunts', get: (r) => r.financingPlan.loanByYear },
    { label: 'Subventions', get: (r) => r.financingPlan.grantByYear },
    { label: 'TOTAL RESSOURCES', get: (r) => r.financingPlan.totalResourcesByYear },
    { label: 'Investissements', get: (r) => r.financingPlan.investmentByYear },
    { label: 'Remboursement emprunt', get: (r) => r.financingPlan.loanRepaymentByYear },
    { label: 'Variation BFR', get: (r) => r.financingPlan.bfrByYear },
    { label: 'TOTAL EMPLOIS', get: (r) => r.financingPlan.totalUsesByYear },
    { label: 'Solde', get: (r) => r.financingPlan.balanceByYear },
    { label: 'Solde cumulé', get: (r) => r.financingPlan.cumulativeBalanceByYear },
  ])
}

function buildRentabiliteSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'Promoteur', 'Entreprise',
    'VAN financière (Ar)', 'TRI financière (%)', 'Indice profit. financière', 'Retour financier',
    'VAN économique (Ar)', 'TRI économique (%)', 'Indice profit. économique', 'Retour économique',
  ]
  const rows = contexts.map(({ company, result }) => {
    const P = result.profitability
    const E = result.economicProfitability
    return [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      num(P.npv, true),
      pctCell(P.irr !== null ? Math.round(P.irr * 10) / 10 : 0),
      num(Math.round(P.profitabilityIndex * 100) / 100),
      lbl(P.paybackYear !== null ? `An ${P.paybackYear}` : 'Non atteint'),
      num(E.npv, true),
      pctCell(E.irr !== null ? Math.round(E.irr * 10) / 10 : 0),
      num(Math.round(E.profitabilityIndex * 100) / 100),
      lbl(E.paybackYear !== null ? `An ${E.paybackYear}` : 'Non atteint'),
    ]
  })
  return buildSheet(headers, rows, [195, 240, 160, 140, 160, 130, 160, 140, 160, 130])
}


function buildEmpruntsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'Promoteur', 'Entreprise', 'Emprunts (libellés)',
    'Principal Ar', 'Taux %', 'Durée ans',
    ...yearHeaders('Capital remboursé Ar'),
    ...yearHeaders('Intérêts Ar'),
    ...yearHeaders('Solde restant Ar'),
    ...YEARS.map((y) => `Capital total remboursé ${y} (Ar)`),
    ...YEARS.map((y) => `Intérêts totaux ${y} (Ar)`),
  ]
  const totalColCount = 10
  const totalStartCol = headers.length - totalColCount

  const { rows, merges } = buildLongFormatRows(
    contexts,
    (ctx) => ctx.result.loanRepaymentTable.byLoan,
    (l, ctx) => {
      const totalCapital = ctx.result.loanRepaymentTable.totalCapitalByYear
      const totalInterest = ctx.result.loanRepaymentTable.totalInterestByYear
      return [
        lbl(normalize(ctx.company.promoteur), true),
        lbl(ctx.company.name),
        lblC(l.label),
        numC(l.principal),
        numC(l.rate),
        numC(l.years),
        ...yearCols(l.annualPayments.map((p) => p.capital)),
        ...yearCols(l.annualPayments.map((p) => p.interest)),
        ...yearCols(l.annualPayments.map((p) => p.balance)),
        ...totalCapital.map((v) => numC(v)),
        ...totalInterest.map((v) => numC(v)),
      ]
    },
    totalStartCol,
    totalColCount,
  )

  const widths = [
    195, 240, 240, 160, 140, 140,
    ...Array(5).fill(130), ...Array(5).fill(130), ...Array(5).fill(130),
    ...Array(10).fill(150),
  ]
  return buildSheet(headers, rows, widths, merges)
}

export async function exportDashboardToExcel(
  projects: ProjectSummary[],
  currentUserId: number | undefined,
  role: UserRole,
  onProgress?: (done: number, total: number) => void,
  scopeLabel?: string,
): Promise<{ skipped: { name: string; reason: string }[] }> {
  const { contexts, skipped } = await loadAllContexts(projects, currentUserId, role, onProgress)

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, buildRecapSheet(contexts), 'Récapitulatif')
  XLSXStyle.utils.book_append_sheet(wb, buildProduitsSheet(contexts), 'Produits')
  XLSXStyle.utils.book_append_sheet(wb, buildMatieresSheet(contexts), 'Matières premières')
  XLSXStyle.utils.book_append_sheet(wb, buildPersonnelSheet(contexts), 'Personnel')
  XLSXStyle.utils.book_append_sheet(wb, buildChargesSheet(contexts), 'Charges')
  XLSXStyle.utils.book_append_sheet(wb, buildInvestissementsSheet(contexts), 'Investissements amortissables')
  XLSXStyle.utils.book_append_sheet(wb, buildInvestTerrainSheet(contexts), 'Investissements non amortis')
  XLSXStyle.utils.book_append_sheet(wb, buildFinancementsSheet(contexts), 'Financements additionnels')
  XLSXStyle.utils.book_append_sheet(wb, buildCompteResultatSheet(contexts), 'Compte de résultat')
  XLSXStyle.utils.book_append_sheet(wb, buildTresorerieSheet(contexts), 'Trésorerie')
  XLSXStyle.utils.book_append_sheet(wb, buildBilanSheet(contexts), 'Bilan')
  XLSXStyle.utils.book_append_sheet(wb, buildPlanFinancementSheet(contexts), 'Plan de financement')
  XLSXStyle.utils.book_append_sheet(wb, buildRentabiliteSheet(contexts), 'Rentabilité')
  XLSXStyle.utils.book_append_sheet(wb, buildEmpruntsSheet(contexts), 'Emprunts')

  const date = new Date().toISOString().slice(0, 10)
  const filename = scopeLabel
    ? `TableauDeBord_${sanitizeFilename(scopeLabel)}_${date}.xlsx`
    : `TableauDeBord_Complet_${date}.xlsx`

  const xlsxBuffer: ArrayBuffer = XLSXStyle.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  return { skipped }
}
