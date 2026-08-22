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

// ─── Helpers cellules (mêmes conventions que le modèle fourni / ExportSection.tsx) ─

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

/** Cellule numérique centrée (ex : "Nb produits" dans le modèle). */
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

/** Construit une feuille à partir d'une liste d'en-têtes + de lignes de cellules déjà stylées. */
function buildSheet(headers: string[], rows: object[][], colWidths?: number[]): Record<string, unknown> {
  const ws: Record<string, unknown> = {}
  let r = 0
  setRow(ws, headers.map((h) => hdr(h)), r++)
  rows.forEach((row) => setRow(ws, row, r++))
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(r - 1, 0), c: headers.length - 1 } })
  if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wpx: w }))
  return ws
}

const DEFAULT_SETTINGS: CompanySettings = {
  infl2: 0, infl3: 0, infl4: 0, infl5: 0,
  discountRate: 0, taxRegime: 'IR', taxRate: 0, taxRateIs: 0, fondsRoulement: 0,
}

function fmtNum(v: number): string {
  if (v === null || v === undefined || !isFinite(v)) return '0'
  const r = Math.round(v * 100) / 100
  return String(r)
}


function paren(values: number[]): string {
  return values.length ? `(${values.map(fmtNum).join(', ')})` : '-'
}

function joinList(values: string[]): string {
  return values.length ? values.join(', ') : '-'
}

function sanitizeFilename(s: string): string {
  const cleaned = s.replace(/[\\/:*?"<>|]/g, '_').trim().replace(/\s+/g, '_')
  return cleaned.slice(0, 60) || 'Export'
}

/** Nombre maximum d'éléments d'une catégorie (produits, matières…) parmi toutes les entreprises. */
function maxCount<T>(contexts: CompanyContext[], getItems: (ctx: CompanyContext) => T[]): number {
  return contexts.reduce((m, ctx) => Math.max(m, getItems(ctx).length), 0)
}

// ─── Contexte complet par entreprise (données brutes + calculs) ──────────────

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

/**
 * Récupère le détail complet (comme à l'ouverture de l'éditeur) de chaque
 * entreprise visible par l'utilisateur, puis relance les calculs financiers.
 * En cas d'échec réseau, retombe sur le cache local hors-ligne si disponible.
 */
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

// ─── Feuille 2 : Produits (une ligne par entreprise, un groupe de colonnes par produit) ─

function buildProduitsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.products)
  const headers = ['Promoteur', 'Entreprise', 'Nb produits', 'Produits (noms)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Prix mensuels Ar (Produit ${n})`,
      `Quantités mensuelles (Produit ${n})`,
      `Croissance annuelle % An2-5 (Produit ${n})`,
      `Chiffre d'affaires An1-5 Ar (Produit ${n})`,
    )
  }
  headers.push(...YEARS.map((y) => `CA total ${y} (Ar)`))

  const rows = contexts.map(({ company, full }) => {
    const products = full.products
    const totalByYear = Array.from({ length: 5 }, (_, y) => products.reduce((s, p) => s + productRevenueByYear(p, y), 0))
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(products.length),
      lblC(joinList(products.map((p) => p.name))),
    ]
    for (let i = 0; i < maxN; i++) {
      const p = products[i]
      if (!p) {
        for (let k = 0; k < 4; k++) row.push(lblC('-'))
      } else {
        row.push(
          lblC(paren(p.monthlyPrice)),
          lblC(paren(p.monthlyQty)),
          lblC(paren(p.growthRates)),
          lblC(paren(Array.from({ length: 5 }, (_, y) => productRevenueByYear(p, y)))),
        )
      }
    }
    row.push(...totalByYear.map((v) => num(v)))
    return row
  })

  const widths = [195, 240, 115, 260]
  for (let i = 0; i < maxN; i++) widths.push(280, 280, 240, 260)
  widths.push(...Array(5).fill(130))
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 3 : Matières premières (une ligne par entreprise, groupe par matière) ─

function buildMatieresSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.materials)
  const headers = ['Promoteur', 'Entreprise', 'Nb matières', 'Matières (noms)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Coût unitaire mensuel Ar (Matière ${n})`,
      `Quantités mensuelles (Matière ${n})`,
      `Croissance annuelle % An2-5 (Matière ${n})`,
    )
  }
  headers.push(...YEARS.map((y) => `Coût total ${y} (Ar)`))

  const rows = contexts.map(({ company, full }) => {
    const materials = full.materials
    const totalByYear = Array.from({ length: 5 }, (_, y) => materials.reduce((s, m) => s + materialCostByYear(m, y), 0))
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(materials.length),
      lblC(joinList(materials.map((m) => m.name))),
    ]
    for (let i = 0; i < maxN; i++) {
      const m = materials[i]
      if (!m) {
        for (let k = 0; k < 3; k++) row.push(lblC('-'))
      } else {
        row.push(lblC(paren(m.monthlyUnitCost)), lblC(paren(m.monthlyQty)), lblC(paren(m.growthRates)))
      }
    }
    row.push(...totalByYear.map((v) => num(v)))
    return row
  })

  const widths = [195, 240, 125, 260]
  for (let i = 0; i < maxN; i++) widths.push(280, 280, 240)
  widths.push(...Array(5).fill(130))
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 4 : Personnel (une ligne par entreprise, groupe par poste) ────────

function buildPersonnelSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.staffMembers)
  const headers = ['Promoteur', 'Entreprise', 'Nb postes', 'Postes (noms)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Salaire mensuel Ar (Poste ${n})`,
      `Effectif (Poste ${n})`,
      `Taux de charges % (Poste ${n})`,
      `Croissance annuelle % An2-5 (Poste ${n})`,
      `Coût annuel An1-5 Ar (Poste ${n})`,
    )
  }
  headers.push(...YEARS.map((y) => `Coût total ${y} (Ar)`))

  const rows = contexts.map(({ company, full }) => {
    const staff = full.staffMembers
    const totalByYear = Array.from({ length: 5 }, (_, y) => staff.reduce((s, st) => s + staffAnnualCostByYear(st, y), 0))
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(staff.length),
      lblC(joinList(staff.map((s) => s.roleName))),
    ]
    for (let i = 0; i < maxN; i++) {
      const s = staff[i]
      if (!s) {
        for (let k = 0; k < 5; k++) row.push(lblC('-'))
      } else {
        row.push(
          numC(s.monthlySalary),
          numC(s.headcount),
          numC(s.chargesRate),
          lblC(paren(s.growthRates)),
          lblC(paren(Array.from({ length: 5 }, (_, y) => staffAnnualCostByYear(s, y)))),
        )
      }
    }
    row.push(...totalByYear.map((v) => num(v)))
    return row
  })

  const widths = [195, 240, 115, 260]
  for (let i = 0; i < maxN; i++) widths.push(200, 120, 180, 240, 280)
  widths.push(...Array(5).fill(140))
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 5 : Charges (une ligne par entreprise, groupe par charge) ─────────

function buildChargesSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.expenses)
  const headers = ['Promoteur', 'Entreprise', 'Nb charges', 'Charges (noms)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Montant mensuel Ar (Charge ${n})`,
      `Présence saisonnière par mois (Charge ${n})`,
      `Inflation annuelle % An2-5 (Charge ${n})`,
      `Total An1-5 Ar (Charge ${n})`,
    )
  }
  headers.push(...YEARS.map((y) => `Total ${y} (Ar)`))

  const rows = contexts.map(({ company, full }) => {
    const exp = full.expenses
    const totalByYear = Array.from({ length: 5 }, (_, y) => exp.reduce((s, e) => s + expenseTotalByYear(e, y), 0))
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(exp.length),
      lblC(joinList(exp.map((e) => e.name))),
    ]
    for (let i = 0; i < maxN; i++) {
      const e = exp[i]
      if (!e) {
        for (let k = 0; k < 4; k++) row.push(lblC('-'))
      } else {
        row.push(
          lblC(paren(e.monthlyAmounts)),
          lblC(paren(e.seasonality)),
          lblC(paren(e.inflationGrowth)),
          lblC(paren(Array.from({ length: 5 }, (_, y) => expenseTotalByYear(e, y)))),
        )
      }
    }
    row.push(...totalByYear.map((v) => num(v)))
    return row
  })

  const widths = [195, 240, 115, 260]
  for (let i = 0; i < maxN; i++) widths.push(280, 280, 240, 260)
  widths.push(...Array(5).fill(130))
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 6 : Investissements amortissables (groupe par investissement) ───

function buildInvestissementsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.investments)
  const headers = ['Promoteur', 'Entreprise', 'Nb investissements', 'Investissements (désignations)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Montant Ar (Investissement ${n})`,
      `Durée amort. ans (Investissement ${n})`,
      `Type d'équipement (Investissement ${n})`,
      `Type d'apport (Investissement ${n})`,
      `Fonds propres Ar / % (Investissement ${n})`,
      `Subvention Ar / % (Investissement ${n})`,
      `Emprunt Ar / % (Investissement ${n})`,
      `Taux et durée emprunt (Investissement ${n})`,
      `Amortissement annuel Ar (Investissement ${n})`,
      `VNC An1-5 Ar (Investissement ${n})`,
    )
  }
  headers.push('Total investissement (Ar)', 'Total fonds propres (Ar)', 'Total subvention (Ar)', 'Total emprunt (Ar)')
  headers.push(...YEARS.map((y) => `VNC totale ${y} (Ar)`))

  const rows = contexts.map(({ company, full, result }) => {
    const inv = full.investments
    const depByInv = new Map(result.depreciationTable.byInvestment.map((d) => [d.investmentId, d]))
    const totalInvest = inv.reduce((s, i) => s + i.amount, 0)
    const totalEquity = inv.reduce((s, i) => s + i.financedEquity, 0)
    const totalGrant  = inv.reduce((s, i) => s + i.financedGrant, 0)
    const totalLoan   = inv.reduce((s, i) => s + i.financedLoan, 0)
    const vncTotalByYear = Array.from({ length: 5 }, (_, y) =>
      inv.reduce((s, i) => s + (depByInv.get(i.id)?.yearlyBook[y] ?? 0), 0),
    )
    const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0)

    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(inv.length),
      lblC(joinList(inv.map((i) => i.name))),
    ]
    for (let i = 0; i < maxN; i++) {
      const it = inv[i]
      if (!it) {
        for (let k = 0; k < 10; k++) row.push(lblC('-'))
      } else {
        const dep = depByInv.get(it.id)
        row.push(
          numC(it.amount),
          numC(it.usefulLife),
          lblC(it.equipmentType === 'electrique' ? 'Électrique' : 'Non électrique'),
          lblC(it.contributionType === 'nature' ? 'Apport en nature' : 'Apport financier'),
          lblC(`${fmtNum(it.financedEquity)} (${fmtNum(pct(it.financedEquity, it.amount))}%)`),
          lblC(`${fmtNum(it.financedGrant)} (${fmtNum(pct(it.financedGrant, it.amount))}%)`),
          lblC(`${fmtNum(it.financedLoan)} (${fmtNum(pct(it.financedLoan, it.amount))}%)`),
          lblC(`${fmtNum(it.loanRate)}% / ${fmtNum(it.loanYears)} ans`),
          numC(it.usefulLife > 0 ? Math.round(it.amount / it.usefulLife) : 0),
          lblC(paren(Array.from({ length: 5 }, (_, y) => dep?.yearlyBook[y] ?? 0))),
        )
      }
    }
    row.push(num(totalInvest), num(totalEquity), num(totalGrant), num(totalLoan))
    row.push(...vncTotalByYear.map((v) => num(v)))
    return row
  })

  const widths = [195, 240, 130, 280]
  for (let i = 0; i < maxN; i++) widths.push(150, 160, 180, 200, 220, 220, 220, 200, 220, 280)
  widths.push(150, 150, 150, 150)
  widths.push(...Array(5).fill(130))
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 7 : Investissements non amortissables (groupe par élément) ──────

function buildInvestTerrainSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.full.investmentTerrains)
  const headers = ['Promoteur', 'Entreprise', 'Nb éléments', 'Investissements non amortis (désignations)']
  for (let i = 0; i < maxN; i++) headers.push(`Montant Ar (Élément ${i + 1})`)
  headers.push('Total (Ar)')

  const rows = contexts.map(({ company, full }) => {
    const it = full.investmentTerrains
    const total = it.reduce((s, x) => s + x.amount, 0)
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(it.length),
      lblC(joinList(it.map((x) => x.name))),
    ]
    for (let i = 0; i < maxN; i++) {
      const x = it[i]
      row.push(x ? numC(x.amount) : lblC('-'))
    }
    row.push(num(total))
    return row
  })

  const widths = [195, 240, 120, 280, ...Array(maxN).fill(170), 150]
  return buildSheet(headers, rows, widths)
}

// ─── Feuille 8 : Financements additionnels (une ligne par entreprise, séries An1-5) ─

function buildFinancementsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const headers = [
    'Promoteur', 'Entreprise',
    'Fonds propres An1-5 (Ar)', 'Emprunt An1-5 (Ar)',
    'Taux emprunt An1-5 (%)', 'Durée emprunt An1-5 (ans)', 'Subvention An1-5 (Ar)',
  ]
  const rows = contexts.map(({ company, full }) => {
    const f = full.additionalFundings
    const seriesFor = (getV: (x: (typeof f)[number]) => number) =>
      paren(Array.from({ length: 5 }, (_, y) => {
        const item = f.find((x) => x.yearNumber === y + 1)
        return item ? getV(item) : 0
      }))
    return [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      lblC(seriesFor((x) => x.equity)),
      lblC(seriesFor((x) => x.loan)),
      lblC(seriesFor((x) => x.loanRate)),
      lblC(seriesFor((x) => x.loanYears)),
      lblC(seriesFor((x) => x.grant)),
    ]
  })
  return buildSheet(headers, rows, [195, 240, 280, 280, 240, 240, 280])
}


function pivotSheet(
  contexts: CompanyContext[],
  indicators: { label: string; get: (r: FullCalculationResult) => number[] }[],
): Record<string, unknown> {
  const headers = ['Promoteur', 'Entreprise', ...indicators.map((i) => `${i.label} An1→An5 (Ar)`)]
  const rows = contexts.map(({ company, result }) => [
    lbl(normalize(company.promoteur), true),
    lbl(company.name),
    ...indicators.map(({ get }) => lblC(paren(get(result)))),
  ])
  const widths = [195, 240, ...indicators.map(() => 260)]
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

// ─── Feuille : Rentabilité (une ligne par entreprise) ─────────────────────────

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

// ─── Feuille : Emprunts (une ligne par entreprise, groupe par emprunt) ────────

function buildEmpruntsSheet(contexts: CompanyContext[]): Record<string, unknown> {
  const maxN = maxCount(contexts, (ctx) => ctx.result.loanRepaymentTable.byLoan)
  const headers = ['Promoteur', 'Entreprise', 'Nb emprunts', 'Emprunts (libellés)']
  for (let i = 0; i < maxN; i++) {
    const n = i + 1
    headers.push(
      `Principal Ar (Emprunt ${n})`,
      `Taux % (Emprunt ${n})`,
      `Durée ans (Emprunt ${n})`,
      `Capital remboursé par an Ar (Emprunt ${n})`,
      `Intérêts par an Ar (Emprunt ${n})`,
      `Solde restant par an Ar (Emprunt ${n})`,
    )
  }

  const rows = contexts.map(({ company, result }) => {
    const loans = result.loanRepaymentTable.byLoan
    const row: object[] = [
      lbl(normalize(company.promoteur), true),
      lbl(company.name),
      numC(loans.length),
      lblC(joinList(loans.map((l) => l.label))),
    ]
    for (let i = 0; i < maxN; i++) {
      const l = loans[i]
      if (!l) {
        for (let k = 0; k < 6; k++) row.push(lblC('-'))
      } else {
        row.push(
          numC(l.principal),
          numC(l.rate),
          numC(l.years),
          lblC(paren(l.annualPayments.map((p) => p.capital))),
          lblC(paren(l.annualPayments.map((p) => p.interest))),
          lblC(paren(l.annualPayments.map((p) => p.balance))),
        )
      }
    }
    return row
  })

  const widths = [195, 240, 130, 280]
  for (let i = 0; i < maxN; i++) widths.push(160, 140, 140, 300, 300, 300)
  return buildSheet(headers, rows, widths)
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
