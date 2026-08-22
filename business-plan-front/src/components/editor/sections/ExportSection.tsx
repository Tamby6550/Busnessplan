import { useMemo, useState } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import type { Product, Material, StaffMember, Expense, Investment, InvestmentTerrain, AdditionalFunding, CompanySettings } from '@/types'
import {
  computeAll,
  buildMonthlyCashFlow,
  formatAriary,
  productRevenueByYear,
  materialCostByYear,
  staffAnnualCostByYear,
  expenseTotalByYear,
} from '@/calculations/calculations'
// @ts-ignore
import XLSXStyle from 'xlsx-js-style'

const YEARS   = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']
const MONTHS  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']


const C = {
  darkBg:     '1E2433',
  primary:    '3A7D2E',
  primaryLt:  '2D6324',
  accent:     'F5A623',
  lightGreen: 'EAF5E6',
  lightBlue:  'EFF6FF',
  lightGray:  'F8FAFC',
  border:     'E2E8F0',
  white:      'FFFFFF',
  textDark:   '1A1A1A',
  textMuted:  '6B7280',
  danger:     'DC2626',
  dangerLt:   'FEF2F2',
  success:    '16A34A',
  blue:       '2563EB',
  purple:     '7C3AED',
  orange:     'B45309',
  rowAlt:     'F0FDF4',
  lightOrange: 'FFF7ED',
}


function allBorder(color = C.border) {
  const side = { style: 'thin', color: { rgb: color } }
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

function subHdr(text: string, bg = C.primary): object {
  return { v: text, t: 's', s: {
    font: { bold: true, sz: 10, color: { rgb: C.white } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorder(),
  }}
}

function sectionRow(text: string, bg = C.primary): object {
  return { v: text, t: 's', s: {
    font: { bold: true, sz: 10, color: { rgb: C.white } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: allBorder(),
  }}
}

function lbl(text: string, bold = false, indent = false, bg?: string): object {
  return { v: text, t: 's', s: {
    font: { bold, sz: 10, color: { rgb: C.textDark } },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: 'left', vertical: 'center', indent: indent ? 1 : 0 },
    border: allBorder(),
  }}
}

function num(value: number, bold = false, colored = false, bg?: string, fmt = '#,##0'): object {
  const color = colored ? (value >= 0 ? C.success : C.danger) : C.textDark
  return { v: value, t: 'n', z: fmt, s: {
    font: { sz: 10, color: { rgb: color }, bold },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: allBorder(),
  }}
}

function numPct(value: number, bold = false, colored = false): object {
  const color = colored ? (value >= 0 ? C.success : C.danger) : C.textDark
  return { v: value / 100, t: 'n', z: '0.0%', s: {
    font: { sz: 10, color: { rgb: color }, bold },
    fill: { fgColor: { rgb: C.white } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: allBorder(),
  }}
}

/** Cellule avec formule Excel (valeur mise en cache pour compatibilité xlsx) */
function numF(formula: string, v: number, bold = false, colored = false, bg?: string, fmt = '#,##0'): object {
  const color = colored ? (v >= 0 ? C.success : C.danger) : C.textDark
  return { f: formula, v, t: 'n', z: fmt, s: {
    font: { sz: 10, color: { rgb: color }, bold },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: allBorder(),
  }}
}


function numPctF(formula: string, v: number, bold = false, colored = false): object {
  const color = colored ? (v >= 0 ? C.success : C.danger) : C.textDark
  return { f: formula, v: v / 100, t: 'n', z: '0.0%', s: {
    font: { sz: 10, color: { rgb: color }, bold },
    fill: { fgColor: { rgb: C.white } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: allBorder(),
  }}
}


function colLetter(i: number): string {
  return i < 26
    ? String.fromCharCode(65 + i)
    : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26))
}


function cellAddr(r: number, c: number): string { return colLetter(c) + (r + 1) }

function txt(text: string, bold = false, color = C.textDark, bg?: string, align: 'left'|'center'|'right' = 'left'): object {
  return { v: text, t: 's', s: {
    font: { bold, sz: 10, color: { rgb: color } },
    fill: { fgColor: { rgb: bg ?? C.white } },
    alignment: { horizontal: align, vertical: 'center' },
    border: allBorder(),
  }}
}

function empty(bg = C.white): object {
  return { v: '', t: 's', s: { fill: { fgColor: { rgb: bg } }, border: allBorder() } }
}

function setRow(ws: Record<string,unknown>, row: object[], rowIdx: number) {
  ;(row as Array<Record<string,unknown>>).forEach((cell, col) => {
    ws[XLSXStyle.utils.encode_cell({ r: rowIdx, c: col })] = cell
  })
}

function merge(ws: Record<string,unknown>, r1: number, c1: number, r2: number, c2: number) {
  ws['!merges'] = ws['!merges'] || []
  ;(ws['!merges'] as object[]).push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
}

function setRange(ws: Record<string,unknown>, rows: number, cols: number) {
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r:0, c:0 }, e: { r: rows-1, c: cols-1 } })
}

function titleBlock(ws: Record<string,unknown>, company: string, title: string, cols: number, r0: number): number {
  ws[XLSXStyle.utils.encode_cell({ r: r0, c: 0 })] = {
    v: company, t: 's', s: {
      font: { bold: true, sz: 14, color: { rgb: C.white } },
      fill: { fgColor: { rgb: C.darkBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  }
  merge(ws, r0, 0, r0, cols-1)
  ws[XLSXStyle.utils.encode_cell({ r: r0+1, c: 0 })] = {
    v: title, t: 's', s: {
      font: { bold: true, sz: 11, color: { rgb: C.white } },
      fill: { fgColor: { rgb: C.primary } },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  }
  merge(ws, r0+1, 0, r0+1, cols-1)
 
  if (!ws['!rows']) ws['!rows'] = []
  ;(ws['!rows'] as Array<{ hpt?: number }>)[r0]   = { hpt: 54 }
  ;(ws['!rows'] as Array<{ hpt?: number }>)[r0+1] = { hpt: 20 }
  return r0+2
}


function buildSyntheseSheet(
  result: ReturnType<typeof computeAll>,
  company: { name: string; secteur?: string; [k:string]: unknown },
  settings: { discountRate: number; taxRegime: string; fondsRoulement?: number },
  products: { length: number },
  staffMembers: Array<{ headcount: number }>,
  investments: Investment[],
  incomeRefs?: IncomeSheetRefs,
  cfRefs?: CashFlowSheetRefs,
  dataRefs?: DataSheetRefs,
  investmentTerrains: InvestmentTerrain[] = [],
  profRefs?: ProfitabilitySheetRefs,
): Record<string,unknown> {
  const IS = result.incomeStatement
  const CF = result.cashFlowStatement
  const KPI = result.profitability
  const R = result.profitabilityRatios
  const ws: Record<string,unknown> = {}
  const COLS = 7
  let r = 0

  r = titleBlock(ws, company.name as string, 'SYNTHÈSE DU BUSINESS PLAN', COLS, r)


  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📋  INFORMATIONS GÉNÉRALES')
  merge(ws, r, 0, r, COLS-1); r++

  const c = company as Record<string, unknown>
  const genreLabel: Record<string, string> = { femme: 'Femme', homme: 'Homme' }
  const modeleLabel: Record<string, string> = { production: 'Production de biens', service: 'Vente de services' }
  const etatLabel: Record<string, string>   = { existante: 'Existante', nouvelle: 'Nouvelle' }

  const infoRows: [string, string][] = [
    ['Nom de l\'entreprise',   company.name as string],
    ['Secteur d\'activité',    (company.secteur as string) || '-'],
    ['Promoteur',              (c.promoteur as string) || '-'],
    ['Genre du promoteur',     genreLabel[c.genre as string] || '-'],
    ['Description de l\'activité', (c.descriptionActivite as string) || '-'],
    ['Marché',                 (c.marche as string) || '-'],
    ['Modèle économique',      (Array.isArray(c.modeleEconomique) ? c.modeleEconomique as string[] : []).map((v) => modeleLabel[v]).filter(Boolean).join(', ') || '-'],
    ['État de l\'activité',    etatLabel[c.etatActivite as string] || '-'],
    ['Régime fiscal',          settings.taxRegime],
    ['Taux d\'actualisation',  `${settings.discountRate} %`],
    ['Nombre de produits',     String(products.length)],
    ['Effectif total',         `${staffMembers.reduce((s,m) => s + m.headcount, 0)} personnes`],
  ]
  infoRows.forEach(([k, v]) => {
    setRow(ws, [lbl(k, true, false, C.lightGray), txt(v, false, C.textDark, C.white), ...Array(COLS-2).fill(empty())], r++)
  })
  r++ // blank

  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🎯  INDICATEURS DE DÉCISION')
  merge(ws, r, 0, r, COLS-1); r++

  setRow(ws, [hdr('Indicateur'), hdr('Valeur'), hdr('Interprétation'), ...Array(COLS-3).fill(empty(C.darkBg))], r++)

 
  const P = profRefs  

 
  const kpiNum = (
    rRef: number | undefined,
    cachedV: number,
    ok: boolean,
    fmt?: string,
  ) => {
    const bg = ok ? C.lightGreen : C.dangerLt
    const color = ok ? C.success : C.danger
    const style = { font: { bold: true, sz: 11, color: { rgb: color } }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allBorder() }
    if (rRef !== undefined) {
      const cell: Record<string,unknown> = { f: `'Rentabilité'!B${rRef+1}`, v: cachedV, t: 'n', s: style }
      if (fmt) cell.z = fmt
      return cell
    }
    const cell: Record<string,unknown> = { v: cachedV, t: 'n', s: style }
    if (fmt) cell.z = fmt
    return cell
  }

  const kpiNotes: Record<string,string> = {
    'VAN (Valeur Actuelle Nette)':                KPI.npv >= 0 ? '✅ Projet crée de la valeur' : '❌ Projet détruit de la valeur',
    'TRI (Taux de Rentabilité Interne)':          KPI.irr !== null ? (KPI.irr > settings.discountRate ? `✅ TRI > taux actualisation (${settings.discountRate} %)` : `⚠️  TRI < taux actualisation (${settings.discountRate} %)`) : 'Flux insuffisants',
    'Indice de profitabilité (IP)':               KPI.profitabilityIndex >= 1 ? '✅ Chaque Ar investi génère un gain' : '❌ Rendement insuffisant',
    'Délai de récupération':                      KPI.paybackYear !== null ? (KPI.paybackYear <= 3 ? '✅ Récupération rapide' : '⚠️  Récupération lente') : '❌ Non récupéré sur 5 ans',
    'Seuil de rentabilité (1ère année positive)': KPI.breakEvenYear !== null ? '✅ Bénéfice atteint dans la période' : '❌ Pas de bénéfice sur 5 ans',
  }

  // VAN
  setRow(ws, [
    lbl('VAN (Valeur Actuelle Nette)', true),
    kpiNum(P?.rVAN, KPI.npv, KPI.npv >= 0, '#,##0'),
    txt(kpiNotes['VAN (Valeur Actuelle Nette)'], false, C.textMuted),
    ...Array(COLS-3).fill(empty()),
  ], r++)

  // TRI
  setRow(ws, [
    lbl('TRI (Taux de Rentabilité Interne)', true),
    KPI.irr !== null
      ? kpiNum(P?.rTRI, KPI.irr / 100, KPI.irr > settings.discountRate, '0.0%')
      : { v: 'N/A', t: 's', s: { font: { bold: true, sz: 11, color: { rgb: C.danger } }, fill: { fgColor: { rgb: C.dangerLt } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allBorder() } },
    txt(kpiNotes['TRI (Taux de Rentabilité Interne)'], false, C.textMuted),
    ...Array(COLS-3).fill(empty()),
  ], r++)

  // IP
  setRow(ws, [
    lbl('Indice de profitabilité (IP)', true),
    kpiNum(P?.rIP, KPI.profitabilityIndex, KPI.profitabilityIndex >= 1, '0.00'),
    txt(kpiNotes['Indice de profitabilité (IP)'], false, C.textMuted),
    ...Array(COLS-3).fill(empty()),
  ], r++)

  // Délai de récupération
  setRow(ws, [
    lbl('Délai de récupération', true),
    kpiNum(P?.rDelai, KPI.paybackYear ?? 6, KPI.paybackYear !== null && KPI.paybackYear <= 3, '"An "0'),
    txt(kpiNotes['Délai de récupération'], false, C.textMuted),
    ...Array(COLS-3).fill(empty()),
  ], r++)

  // 1ère année profitable
  setRow(ws, [
    lbl('Seuil de rentabilité (1ère année positive)', true),
    kpiNum(P?.rProfit, KPI.breakEvenYear ?? 6, KPI.breakEvenYear !== null, '"An "0'),
    txt(kpiNotes['Seuil de rentabilité (1ère année positive)'], false, C.textMuted),
    ...Array(COLS-3).fill(empty()),
  ], r++)
  r++

  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📊  SYNTHÈSE FINANCIÈRE 5 ANS (en Ar)')
  merge(ws, r, 0, r, COLS-1); r++

  setRow(ws, [hdr('Indicateur'), ...YEARS.map(y => hdr(y)), empty(C.darkBg)].slice(0, COLS), r++)


  type FinRowDef = { label: string; vals: number[]; bold: boolean; colored: boolean; isPct?: boolean; formula?: (yi: number) => string }
  const finRowDefs: FinRowDef[] = [
    {
      label: "Chiffre d'affaires", bold: true, colored: false,
      vals: IS.revenueByYear,
      formula: incomeRefs ? (yi) => `'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1}` : undefined,
    },
    {
      label: 'Marge brute', bold: false, colored: false,
      vals: IS.grossMarginByYear,
      formula: incomeRefs ? (yi) => `'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rMB+1}` : undefined,
    },
    {
      label: 'Marge brute %', bold: false, colored: false, isPct: true,
      vals: R.grossMarginPctByYear,
      formula: incomeRefs ? (yi) => `IF('Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1}<>0,'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rMB+1}/'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1},0)` : undefined,
    },
    {
      label: 'EBITDA', bold: true, colored: false,
      vals: IS.ebitdaByYear,
      formula: incomeRefs ? (yi) => `'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rEBIT+1}` : undefined,
    },
    {
      label: 'EBITDA margin %', bold: false, colored: false, isPct: true,
      vals: R.ebitdaMarginPctByYear,
      formula: incomeRefs ? (yi) => `IF('Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1}<>0,'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rEBIT+1}/'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1},0)` : undefined,
    },
    {
      label: 'Résultat net', bold: true, colored: true,
      vals: IS.netIncomeByYear,
      formula: incomeRefs ? (yi) => `'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rNI+1}` : undefined,
    },
    {
      label: 'Marge nette %', bold: false, colored: true, isPct: true,
      vals: R.netMarginPctByYear,
      formula: incomeRefs ? (yi) => `IF('Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1}<>0,'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rNI+1}/'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rCA+1},0)` : undefined,
    },
    {
      label: 'Trésorerie cumulée', bold: true, colored: true,
      vals: CF.cumulativeCashByYear,
      formula: cfRefs ? (yi) => `'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rCumul+1}` : undefined,
    },
  ]
  finRowDefs.forEach(({ label, vals, bold, colored, isPct, formula }) => {
    const bg = bold ? C.lightGreen : undefined
    setRow(ws, [
      lbl(label, bold, !bold),
      ...Array.from({ length: 5 }, (_, yi) => {
        if (formula) {
          return isPct
            ? numPctF(formula(yi), vals[yi], bold, colored)
            : numF(formula(yi), vals[yi], bold, colored, bg)
        }
        return isPct ? numPct(vals[yi], bold, colored) : num(vals[yi], bold, colored, bg)
      }),
      empty(),
    ].slice(0, COLS), r++)
  })
  r++


  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📉  SEUIL DE RENTABILITÉ (en Ar)')
  merge(ws, r, 0, r, COLS-1); r++

  setRow(ws, [hdr('Indicateur'), ...YEARS.map(y => hdr(y)), empty(C.darkBg)].slice(0, COLS), r++)
  setRow(ws, [
    lbl('Seuil de rentabilité (Ar)', true, false, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      P?.rSeuil !== undefined
        ? numF(`'Rentabilité'!${colLetter(1+yi)}${P.rSeuil+1}`, R.breakEvenValueByYear[yi], true, false, C.lightGray)
        : num(R.breakEvenValueByYear[yi], true, false, C.lightGray)
    ),
    empty(C.lightGray),
  ].slice(0, COLS), r++)
  r++

  
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('💰  STRUCTURE DU FINANCEMENT INITIAL')
  merge(ws, r, 0, r, COLS-1); r++

  const totalInv   = investments.reduce((s,i) => s + i.amount, 0)
  const totalEq    = investments.reduce((s,i) => s + i.financedEquity, 0)
  const totalLoan  = investments.reduce((s,i) => s + i.financedLoan, 0)
  const totalGrant = investments.reduce((s,i) => s + i.financedGrant, 0)
  const hasInvR    = (dataRefs?.invCount ?? 0) > 0
  const invTotRow  = dataRefs?.invTotalExcelRow ?? 0
  const totalInvTerrain = investmentTerrains.reduce((s, i) => s + i.amount, 0)

  setRow(ws, [hdr('Source'), hdr('Montant (Ar)'), hdr('Part %'), ...Array(COLS-3).fill(empty(C.darkBg))], r++)

 
  if (totalEq > 0 || totalInvTerrain > 0) {
    setRow(ws, [
      lbl('Fonds propres total', true, false, C.lightGreen),
      num(totalEq + totalInvTerrain, true, false, C.lightGreen),
      empty(C.lightGreen),
      ...Array(COLS-3).fill(empty()),
    ], r++)
  }

  
  const fundDefs: [string, number, string][] = [
    ['Total investissement amortissable', totalInv,  `'Données de base'!B${invTotRow}`],
    ['Total fonds propres amortissables', totalEq, `'Données de base'!C${invTotRow}`],
    ['Emprunts',             totalLoan, `'Données de base'!E${invTotRow}`],
    ['Subventions',          totalGrant,`'Données de base'!G${invTotRow}`],
  ]
  fundDefs.forEach(([name, val, formula], i) => {
    const pct = totalInv > 0 ? val / totalInv : 0
    const bg  = i === 0 ? C.lightGreen : C.white
    const amountCell = hasInvR
      ? numF(formula, val, i === 0, false, bg)
      : num(val, i === 0, false, bg)
    const pctCell = hasInvR && i > 0
      ? numPctF(`IF('Données de base'!B${invTotRow}<>0,${formula}/'Données de base'!B${invTotRow},0)`, pct * 100)
      : { v: pct, t: 'n', z: '0.0%', s: { font: { sz: 10, color: { rgb: C.textDark } }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: 'right' }, border: allBorder() } }
    setRow(ws, [lbl(name, i === 0, false, bg), amountCell, pctCell, ...Array(COLS-3).fill(empty())], r++)
  })

  
  if (totalInvTerrain > 0) {
    const hasInvTerrainR = (dataRefs?.invTerrainCount ?? 0) > 0
    const invTerrainTotRow = dataRefs?.invTerrainTotalExcelRow ?? 0
    const amountCell = hasInvTerrainR
      ? numF(`'Données de base'!B${invTerrainTotRow}`, totalInvTerrain, false, false, C.lightBlue)
      : num(totalInvTerrain, false, false, C.lightBlue)
    setRow(ws, [
      lbl('Total investissement Terrain', false, false, C.lightBlue),
      amountCell, empty(C.lightBlue),
      ...Array(COLS-3).fill(empty()),
    ], r++)
  }


  const bfr = settings.fondsRoulement ?? 0
  if (bfr > 0) {
    setRow(ws, [
      lbl('Fonds de roulement initial', false, false, C.lightBlue),
      num(bfr, false, false, C.lightBlue), empty(C.lightBlue),
      ...Array(COLS-3).fill(empty()),
    ], r++)
  }

  ws['!cols'] = [220, 140, 90, 90, 90, 90, 90].map(w => ({ wpx: w }))
  ws['!rows'] = [{ hpx: 28 }, { hpx: 22 }]
  setRange(ws, r, COLS)
  return ws
}



interface DataSheetRefs {
  totalCAExcelRow: number      // ligne Excel (1-indexée) du total CA
  totalMatExcelRow: number     // ligne Excel du total matières
  totalStaffExcelRow: number   // ligne Excel du total personnel
  totalChargesExcelRow: number // ligne Excel du total charges
  prodAnCols: number[]         // [26,28,30,32,34] — col indices An1..5 dans TOTAL CA (table produits, avec prix mensuel)
  matAnCols: number[]          // [26,28,30,32,34] — col indices An1..5 dans TOTAL MAT (table matières, avec coût mensuel)
  staffAnCols: number[]        // [4,6,8,10,12]   — col indices An1..5 dans TOTAL PERSONNEL
  expAnCols: number[]          // [26,28,30,32,34] — col indices An1..5 dans TOTAL CHARGES (table charges, avec montant mensuel)
  invFirstDataRow: number      // ligne Excel (1-indexée) du 1er investissement
  invCount: number             // nombre d'investissements
  invTotalExcelRow: number     // ligne Excel (1-indexée) de la ligne TOTAL investissements
  invTerrainFirstDataRow: number
  invTerrainCount: number
  invTerrainTotalExcelRow: number
  prodFirstDataRow: number; prodDataCount: number
  matFirstDataRow: number;  matDataCount: number
  staffFirstDataRow: number; staffDataCount: number
  expFirstDataRow: number;  expDataCount: number
}


interface IncomeSheetRefs {
  rCA: number; rMat: number; rMB: number
  rSta: number; rExp: number; rEBIT: number
  rDep: number; rEBIT2: number; rInt: number
  rEBT: number; rTax: number; rNI: number
}

interface CashFlowSheetRefs {
  rCAF: number     // CAF (flux opérationnel)
  rNet: number     // Trésorerie nette annuelle
  rCumul: number   // Trésorerie cumulée
  rRemb: number    // Remboursements capital (An 1-5)
  rAFTotal: number // Total apports complémentaires
  rInitEq: number    // Fonds propres initiaux (col B = An1 uniquement)
  rInitGrant: number // Subventions initiales  (col B = An1 uniquement)
  rInitBfr: number   // Fonds de roulement initial (col B)
  rAFEq: number      // Fonds propres additionnels (col B-F = An1-5)
  rAFGrant: number   // Subventions additionnelles (col B-F = An1-5)
}

interface ProfitabilitySheetRefs {
  rVAN: number    // ligne VAN    (col B = valeur)
  rTRI: number    // ligne TRI    (col B = valeur %)
  rIP: number     // ligne IP     (col B = valeur)
  rDelai: number  // ligne Délai  (col B = valeur)
  rProfit: number // ligne 1ère année profitable (col B)
  rSeuil: number  // ligne Seuil de rentabilité annuel (col B=An1 … F=An5)
}

/** Helper : formule référençant une cellule d'une autre feuille */
function xRef(sheetName: string, rowIdx: number, yi: number): string {
  return `'${sheetName}'!${colLetter(1 + yi)}${rowIdx + 1}`
}

// Chaque tableau intègre : données de base + mois éditables + taux de croissance + coûts annuels
function buildDataSheet(
  result: ReturnType<typeof computeAll>,
  products: Product[],
  materials: Material[],
  staffMembers: StaffMember[],
  expenses: Expense[],
  investments: Investment[],
  companyName: string,
  investmentTerrains: InvestmentTerrain[] = [],
): { ws: Record<string,unknown>; refs: DataSheetRefs } {
  const ws: Record<string,unknown> = {}
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const COLS = 35  // max (produits, avec le détail des prix mensuels)
  let r = 0
  r = titleBlock(ws, companyName, 'DONNÉES DE BASE', COLS, r)



  // ══════════════════════════════════════════════════════════════════════════
  // PRODUITS & VENTES
  // ══════════════════════════════════════════════════════════════════════════
  if (products.length > 0) {
    ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🛒  PRODUITS & VENTES')
    merge(ws, r, 0, r, COLS-1); r++

    // En-tête : nom, 12 mois de quantité, total, 12 mois de prix, puis CA An 1-5
    setRow(ws, [
      hdr('Produit'),
      ...MONTHS.map(m => hdr(`Qté ${m}`)),
      hdr('Total qté/an'),
      ...MONTHS.map(m => hdr(`Prix ${m}`)),
      hdr('CA An 1'), hdr('Taux An 2 %'), hdr('CA An 2'),
      hdr('Taux An 3 %'), hdr('CA An 3'),
      hdr('Taux An 4 %'), hdr('CA An 4'),
      hdr('Taux An 5 %'), hdr('CA An 5'),
    ], r++)

    const prodFirstRow = r
    // Mémoriser le Excel row (1-indexed) de chaque produit pour le mini-tableau mensuel
    const prodRowMap: { er: number; p: typeof products[0] }[] = []
    products.forEach(p => {
      const er = r + 1  // Excel row (1-indexed)
      prodRowMap.push({ er, p })
      const baseQty = p.monthlyQty.reduce((a, b) => a + b, 0)
      // col B=1..M=12 → mois qté; N=13 → total; O-Z=14-25 → mois prix; AA=26 → An1
      const an1Col   = colLetter(26)  // AA
      const an2Col   = colLetter(28)  // AC
      const an3Col   = colLetter(30)  // AE
      const an4Col   = colLetter(32)  // AG
      const tx2Col   = colLetter(27)  // AB
      const tx3Col   = colLetter(29)  // AD
      const tx4Col   = colLetter(31)  // AF
      const tx5Col   = colLetter(33)  // AH
      setRow(ws, [
        lbl(p.name, true),
        // Quantité produits : décimales autorisées (ex: 2.75)
        ...Array.from({ length: 12 }, (_, mi) => num(p.monthlyQty[mi] ?? 0, false, false, undefined, '#,##0.##')),
        numF(`SUM(B${er}:M${er})`, baseQty, true, false, C.lightGreen, '#,##0.##'),
        // Prix par mois (Janvier à Décembre) — variation saisonnière possible
        ...Array.from({ length: 12 }, (_, mi) => num(p.monthlyPrice[mi] ?? 0, false, false, C.lightBlue)),
        // CA An 1 = SUMPRODUCT(quantités × prix mensuels) — formule live dans Excel
        numF(`SUMPRODUCT(B${er}:M${er},O${er}:Z${er})`, productRevenueByYear(p, 0)),
        numPct(p.growthRates?.[0] ?? 0),
        numF(`${an1Col}${er}*(1+${tx2Col}${er})`, productRevenueByYear(p, 1)),
        numPct(p.growthRates?.[1] ?? 0),
        numF(`${an2Col}${er}*(1+${tx3Col}${er})`, productRevenueByYear(p, 2)),
        numPct(p.growthRates?.[2] ?? 0),
        numF(`${an3Col}${er}*(1+${tx4Col}${er})`, productRevenueByYear(p, 3)),
        numPct(p.growthRates?.[3] ?? 0),
        numF(`${an4Col}${er}*(1+${tx5Col}${er})`, productRevenueByYear(p, 4)),
      ], r++)
    })

    // TOTAL CA — aligné sur les colonnes des lignes individuelles (An y à col 26+2y)
    const totalCARow = r
    const prodAnCols = [26, 28, 30, 32, 34]
    {
      const totalRow: object[] = Array(35).fill(null).map(() => empty(C.lightGreen))
      totalRow[0] = lbl('TOTAL CA', true, false, C.lightGreen)
      for (let yi = 0; yi < 5; yi++) {
        const col = colLetter(prodAnCols[yi])
        totalRow[prodAnCols[yi]] = numF(
          `SUM(${col}${prodFirstRow + 1}:${col}${r})`,
          result.incomeStatement.revenueByYear[yi],
          true, false, C.lightGreen,
        )
      }
      setRow(ws, totalRow, r++)
    }
    r++
    // Séparé du tableau principal pour ne pas interférer avec les formules SUM/TOTAL CA
    if (prodRowMap.length > 0) {
      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📊  CA MENSUEL PAR PRODUIT', C.orange)
      merge(ws, r, 0, r, 13); r++
      setRow(ws, [hdr('Produit'), ...MONTHS.map(m => hdr(m)), hdr('Total An 1')], r++)
      const caBreakFirst = r  // 0-indexed premier produit dans ce mini-tableau
      for (const { er, p } of prodRowMap) {
        const brER = r + 1  // 1-indexed Excel row de cette ligne
        const brRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        brRow[0] = lbl(p.name, false, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const qCol = colLetter(1 + mi)   // B..M (réf. qté dans tableau principal)
          const pCol = colLetter(14 + mi)  // O..Z (réf. prix dans tableau principal)
          const monthlyCA = (p.monthlyQty[mi] ?? 0) * (p.monthlyPrice[mi] ?? 0)
          brRow[1 + mi] = numF(`${qCol}${er}*${pCol}${er}`, monthlyCA, false, false, C.lightOrange)
        }
        brRow[13] = numF(`SUM(B${brER}:M${brER})`, productRevenueByYear(p, 0), false, false, C.lightOrange)
        setRow(ws, brRow, r++)
      }
      // Ligne total CA mensuel
      {
        const totER = r + 1
        const totRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        totRow[0] = lbl('Total CA mensuel (Ar)', true, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const col = colLetter(1 + mi)
          const monthlyCA = products.reduce((s, p) => s + (p.monthlyQty[mi] ?? 0) * (p.monthlyPrice[mi] ?? 0), 0)
          totRow[1 + mi] = numF(`SUM(${col}${caBreakFirst + 1}:${col}${r})`, monthlyCA, true, false, C.lightOrange)
        }
        totRow[13] = numF(`SUM(B${totER}:M${totER})`, result.incomeStatement.revenueByYear[0], true, false, C.lightOrange)
        setRow(ws, totRow, r++)
      }
      r++
    }

    // ─── Matières premières ──────────────────────────────────────────────
    ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📦  MATIÈRES PREMIÈRES')
    merge(ws, r, 0, r, COLS-1); r++

    setRow(ws, [
      hdr('Matière'),
      ...MONTHS.map(m => hdr(`Qté ${m}`)),
      hdr('Total qté/an'),
      ...MONTHS.map(m => hdr(`Coût ${m}`)),
      hdr('Coût An 1'), hdr('Taux An 2 %'), hdr('Coût An 2'),
      hdr('Taux An 3 %'), hdr('Coût An 3'),
      hdr('Taux An 4 %'), hdr('Coût An 4'),
      hdr('Taux An 5 %'), hdr('Coût An 5'),
    ], r++)

    const matFirstRow = r
    const matRowMap: { er: number; m: typeof materials[0] }[] = []
    materials.forEach(m => {
      const er = r + 1
      matRowMap.push({ er, m })
      const baseQty = m.monthlyQty.reduce((a, b) => a + b, 0)
      // col B=1..M=12 → mois qté; N=13 → total; O-Z=14-25 → mois coût; AA=26 → An1
      const an1Col = colLetter(26); const tx2Col = colLetter(27); const an2Col = colLetter(28)
      const tx3Col = colLetter(29); const an3Col = colLetter(30); const tx4Col = colLetter(31)
      const an4Col = colLetter(32); const tx5Col = colLetter(33)
      setRow(ws, [
        lbl(m.name, true),
        // Quantité matières : décimales autorisées (ex: 2.75)
        ...Array.from({ length: 12 }, (_, mi) => num(m.monthlyQty[mi] ?? 0, false, false, undefined, '#,##0.##')),
        numF(`SUM(B${er}:M${er})`, baseQty, true, false, C.lightGreen, '#,##0.##'),
        // Coût par mois (Janvier à Décembre) — variation saisonnière possible
        ...Array.from({ length: 12 }, (_, mi) => num(m.monthlyUnitCost[mi] ?? 0, false, false, C.lightBlue)),
        // Coût An 1 = SUMPRODUCT(quantités × coûts mensuels) — formule live dans Excel
        numF(`SUMPRODUCT(B${er}:M${er},O${er}:Z${er})`, materialCostByYear(m, 0)),
        numPct(m.growthRates?.[0] ?? 0),
        numF(`${an1Col}${er}*(1+${tx2Col}${er})`, materialCostByYear(m, 1)),
        numPct(m.growthRates?.[1] ?? 0),
        numF(`${an2Col}${er}*(1+${tx3Col}${er})`, materialCostByYear(m, 2)),
        numPct(m.growthRates?.[2] ?? 0),
        numF(`${an3Col}${er}*(1+${tx4Col}${er})`, materialCostByYear(m, 3)),
        numPct(m.growthRates?.[3] ?? 0),
        numF(`${an4Col}${er}*(1+${tx5Col}${er})`, materialCostByYear(m, 4)),
      ], r++)
    })

    const totalMatRow = r
    const matAnCols = [26, 28, 30, 32, 34]  // layout matières aligné sur celui des produits (35 cols)
    {
      const matTotalRow: object[] = Array(35).fill(null).map(() => empty(C.lightGreen))
      matTotalRow[0] = lbl('TOTAL MATIÈRES', true, false, C.lightGreen)
      for (let yi = 0; yi < 5; yi++) {
        const col = colLetter(matAnCols[yi])
        matTotalRow[matAnCols[yi]] = numF(`SUM(${col}${matFirstRow + 1}:${col}${r})`, result.incomeStatement.materialCostByYear[yi], true, false, C.lightGreen)
      }
      setRow(ws, matTotalRow, r++)
    }
    r++

    // ─── Mini-tableau : Coût mensuel par matière ─────────────────────────
    if (matRowMap.length > 0) {
      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📊  COÛT MENSUEL PAR MATIÈRE', C.orange)
      merge(ws, r, 0, r, 13); r++
      setRow(ws, [hdr('Matière'), ...MONTHS.map(m => hdr(m)), hdr('Total An 1')], r++)
      const matBreakFirst = r
      for (const { er, m } of matRowMap) {
        const brER = r + 1
        const brRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        brRow[0] = lbl(m.name, false, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const qCol = colLetter(1 + mi)
          const cCol = colLetter(14 + mi)
          const monthlyCost = (m.monthlyQty[mi] ?? 0) * (m.monthlyUnitCost[mi] ?? 0)
          brRow[1 + mi] = numF(`${qCol}${er}*${cCol}${er}`, monthlyCost, false, false, C.lightOrange)
        }
        brRow[13] = numF(`SUM(B${brER}:M${brER})`, materialCostByYear(m, 0), false, false, C.lightOrange)
        setRow(ws, brRow, r++)
      }
      {
        const totER = r + 1
        const totRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        totRow[0] = lbl('Total Coût mensuel (Ar)', true, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const col = colLetter(1 + mi)
          const mc = materials.reduce((s, mat) => s + (mat.monthlyQty[mi] ?? 0) * (mat.monthlyUnitCost[mi] ?? 0), 0)
          totRow[1 + mi] = numF(`SUM(${col}${matBreakFirst + 1}:${col}${r})`, mc, true, false, C.lightOrange)
        }
        totRow[13] = numF(`SUM(B${totER}:M${totER})`, result.incomeStatement.materialCostByYear[0], true, false, C.lightOrange)
        setRow(ws, totRow, r++)
      }
      r++
    }

    // ─── Personnel ───────────────────────────────────────────────────────
    ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('👥  PERSONNEL')
    merge(ws, r, 0, r, COLS-1); r++

    setRow(ws, [
      hdr('Poste'), hdr('Salaire mens. (Ar)'), hdr('Effectif'), hdr('Charges soc. %'),
      hdr('Coût An 1'), hdr('Taux An 2 %'), hdr('Coût An 2'),
      hdr('Taux An 3 %'), hdr('Coût An 3'),
      hdr('Taux An 4 %'), hdr('Coût An 4'),
      hdr('Taux An 5 %'), hdr('Coût An 5'),
    ], r++)

    const staffFirstRow = r
    const staffAnCols = [4, 6, 8, 10, 12]  // E,G,I,K,M — An1..5 dans chaque ligne staff
    staffMembers.forEach(s => {
      const er = r + 1
      // An1 = sal × eff × 12 × (1+charges%) — numPct stocke chargesRate/100 donc (1+D) pas /100
      setRow(ws, [
        lbl(s.roleName, true),
        num(s.monthlySalary),
        num(s.headcount),
        numPct(s.chargesRate),
        numF(`B${er}*C${er}*12*(1+D${er})`, staffAnnualCostByYear(s, 0)),
        numPct(s.growthRates?.[0] ?? 0),
        numF(`E${er}*(1+F${er})`, staffAnnualCostByYear(s, 1)),
        numPct(s.growthRates?.[1] ?? 0),
        numF(`G${er}*(1+H${er})`, staffAnnualCostByYear(s, 2)),
        numPct(s.growthRates?.[2] ?? 0),
        numF(`I${er}*(1+J${er})`, staffAnnualCostByYear(s, 3)),
        numPct(s.growthRates?.[3] ?? 0),
        numF(`K${er}*(1+L${er})`, staffAnnualCostByYear(s, 4)),
      ], r++)
    })

    const totalStaffRow = r
    // TOTAL STAFF aligné sur les colonnes des lignes individuelles (An y à col staffAnCols[y])
    {
      const staffTotalRow: object[] = Array(13).fill(null).map(() => empty(C.lightGreen))
      staffTotalRow[0] = lbl('TOTAL PERSONNEL', true, false, C.lightGreen)
      for (let yi = 0; yi < 5; yi++) {
        const col = colLetter(staffAnCols[yi])
        staffTotalRow[staffAnCols[yi]] = numF(`SUM(${col}${staffFirstRow + 1}:${col}${r})`, result.incomeStatement.staffCostByYear[yi], true, false, C.lightGreen)
      }
      setRow(ws, staffTotalRow, r++)
    }
    r++

   
    ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow("🧾  CHARGES D'EXPLOITATION")
    merge(ws, r, 0, r, COLS-1); r++

    setRow(ws, [
      hdr('Désignation'),
      ...MONTHS.map(m => hdr(`Qté ${m}`)),
      hdr('Total qté/an'),
      ...MONTHS.map(m => hdr(`Montant ${m}`)),
      hdr('Coût An 1'), hdr('Taux An 2 %'), hdr('Coût An 2'),
      hdr('Taux An 3 %'), hdr('Coût An 3'),
      hdr('Taux An 4 %'), hdr('Coût An 4'),
      hdr('Taux An 5 %'), hdr('Coût An 5'),
    ], r++)

    const expFirstRow = r
    const expAnCols = [26, 28, 30, 32, 34]  // aligné sur le layout produits/matières (35 cols)
    const expRowMap: { er: number; e: typeof expenses[0] }[] = []
    expenses.forEach(e => {
      const er = r + 1
      expRowMap.push({ er, e })
      const baseQty = e.seasonality.reduce((a, b) => a + b, 0)
      const an1Col = colLetter(26); const tx2Col = colLetter(27); const an2Col = colLetter(28)
      const tx3Col = colLetter(29); const an3Col = colLetter(30); const tx4Col = colLetter(31)
      const an4Col = colLetter(32); const tx5Col = colLetter(33)
      setRow(ws, [
        lbl(e.name, true),
        // Quantité (ex-saisonnalité) : coefficient mensuel, décimales autorisées (ex: 0.33)
        ...Array.from({ length: 12 }, (_, mi) => num(e.seasonality[mi] ?? 0, false, false, undefined, '#,##0.##')),
        numF(`SUM(B${er}:M${er})`, baseQty, true, false, C.lightGreen, '#,##0.##'),
        // Montant par mois (Janvier à Décembre) — variation saisonnière possible
        ...Array.from({ length: 12 }, (_, mi) => num(e.monthlyAmounts[mi] ?? 0, false, false, C.lightBlue)),
        // Coût An 1 = SUMPRODUCT(quantités × montants mensuels) — formule live dans Excel
        numF(`SUMPRODUCT(B${er}:M${er},O${er}:Z${er})`, expenseTotalByYear(e, 0)),
        numPct(e.inflationGrowth?.[0] ?? 0),
        numF(`${an1Col}${er}*(1+${tx2Col}${er})`, expenseTotalByYear(e, 1)),
        numPct(e.inflationGrowth?.[1] ?? 0),
        numF(`${an2Col}${er}*(1+${tx3Col}${er})`, expenseTotalByYear(e, 2)),
        numPct(e.inflationGrowth?.[2] ?? 0),
        numF(`${an3Col}${er}*(1+${tx4Col}${er})`, expenseTotalByYear(e, 3)),
        numPct(e.inflationGrowth?.[3] ?? 0),
        numF(`${an4Col}${er}*(1+${tx5Col}${er})`, expenseTotalByYear(e, 4)),
      ], r++)
    })

    const totalChargesRow = r
    // TOTAL CHARGES aligné sur les colonnes des lignes individuelles (An y à col expAnCols[y])
    {
      const expTotalRow: object[] = Array(35).fill(null).map(() => empty(C.lightGreen))
      expTotalRow[0] = lbl('TOTAL CHARGES', true, false, C.lightGreen)
      for (let yi = 0; yi < 5; yi++) {
        const col = colLetter(expAnCols[yi])
        expTotalRow[expAnCols[yi]] = numF(`SUM(${col}${expFirstRow + 1}:${col}${r})`, result.incomeStatement.expenseCostByYear[yi], true, false, C.lightGreen)
      }
      setRow(ws, expTotalRow, r++)
    }

    // ─── Mini-tableau : Charge mensuelle par poste ────────────────────────
    if (expRowMap.length > 0) {
      r++
      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow("📊  CHARGE MENSUELLE PAR POSTE", C.orange)
      merge(ws, r, 0, r, 13); r++
      setRow(ws, [hdr('Charge'), ...MONTHS.map(m => hdr(m)), hdr('Total An 1')], r++)
      const expBreakFirst = r
      for (const { er, e } of expRowMap) {
        const brER = r + 1
        const brRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        brRow[0] = lbl(e.name, false, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const qCol = colLetter(1 + mi)
          const aCol = colLetter(14 + mi)
          const monthlyExp = (e.seasonality[mi] ?? 0) * (e.monthlyAmounts[mi] ?? 0)
          brRow[1 + mi] = numF(`${qCol}${er}*${aCol}${er}`, monthlyExp, false, false, C.lightOrange)
        }
        brRow[13] = numF(`SUM(B${brER}:M${brER})`, expenseTotalByYear(e, 0), false, false, C.lightOrange)
        setRow(ws, brRow, r++)
      }
      {
        const totER = r + 1
        const totRow: object[] = Array(14).fill(null).map(() => empty(C.lightOrange))
        totRow[0] = lbl('Total Charge mensuelle (Ar)', true, false, C.lightOrange)
        for (let mi = 0; mi < 12; mi++) {
          const col = colLetter(1 + mi)
          const me = expenses.reduce((s, e) => s + (e.seasonality[mi] ?? 0) * (e.monthlyAmounts[mi] ?? 0), 0)
          totRow[1 + mi] = numF(`SUM(${col}${expBreakFirst + 1}:${col}${r})`, me, true, false, C.lightOrange)
        }
        totRow[13] = numF(`SUM(B${totER}:M${totER})`, result.incomeStatement.expenseCostByYear[0], true, false, C.lightOrange)
        setRow(ws, totRow, r++)
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INVESTISSEMENTS
    // ══════════════════════════════════════════════════════════════════════════
    let invRefs = { invFirstDataRow: 0, invCount: 0, invTotalExcelRow: 0 }
    if (investments.length > 0) {
      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🏗️  INVESTISSEMENTS')
      merge(ws, r, 0, r, COLS-1); r++

      // Colonnes investissements (18 cols, A=0) :
      // 0=nom 1=montant 2=FP_Ar 3=FP_% 4=Empr_Ar 5=Empr_% 6=Sub_Ar 7=Sub_%
      // 8=durée 9=taux_empr 10=amort 11=VNC1 12=VNC2 13=VNC3 14=VNC4 15=VNC5
      // 16=type équipement 17=type apport — ajoutées en fin de tableau (pas insérées au
      // milieu) pour ne décaler aucune des références de colonne (B, C, E, G...) utilisées
      // par formule ailleurs dans le classeur (Trésorerie, Rentabilité, Plan de financement).
      setRow(ws, [
        hdr('Désignation'),
        hdr('Montant (Ar)'),
        hdr('Fonds propres (Ar)'),
        hdr('FP %'),
        hdr('Emprunt (Ar)'),
        hdr('Emprunt %'),
        hdr('Subvention (Ar)'),
        hdr('Subvention %'),
        hdr('Durée (ans)'),
        hdr('Taux emprunt %'),
        hdr('Amort. annuel'),
        hdr('VNC An 1'),
        hdr('VNC An 2'),
        hdr('VNC An 3'),
        hdr('VNC An 4'),
        hdr('VNC An 5'),
        hdr("Type d'équipement"),
        hdr("Type d'apport"),
      ], r++)

      const invFirstRow = r
      const totalInvAmount    = investments.reduce((s, i) => s + i.amount, 0)
      const totalInvEquity    = investments.reduce((s, i) => s + i.financedEquity, 0)
      const totalInvLoan      = investments.reduce((s, i) => s + i.financedLoan, 0)
      const totalInvGrant     = investments.reduce((s, i) => s + i.financedGrant, 0)

      investments.forEach((inv, i) => {
        const depRow = result.depreciationTable.byInvestment[i]
        const annualDep = inv.usefulLife > 0 ? Math.round(inv.amount / inv.usefulLife) : 0
        const er = r + 1
        // Col I (index 8) = durée → amort = B/I
        setRow(ws, [
          lbl(inv.name, true),                                              // A
          num(inv.amount),                                                  // B
          num(inv.financedEquity),                                          // C
          numPctF(`IF(B${er}>0,C${er}/B${er},0)`,                           // D = FP%
            inv.amount > 0 ? (inv.financedEquity / inv.amount) * 100 : 0),
          num(inv.financedLoan),                                            // E
          numPctF(`IF(B${er}>0,E${er}/B${er},0)`,                         // F = Emprunt%
            inv.amount > 0 ? (inv.financedLoan / inv.amount) * 100 : 0),
          num(inv.financedGrant),                                           // G
          numPctF(`IF(B${er}>0,G${er}/B${er},0)`,                         // H = Sub%
            inv.amount > 0 ? (inv.financedGrant / inv.amount) * 100 : 0),
          num(inv.usefulLife),                                              // I
          numPct(inv.loanRate ?? 0),                                        // J
          numF(`IF(I${er}>0,B${er}/I${er},0)`, annualDep),                 // K = amort
          numF(`MAX(0,B${er}-K${er}*1)`, depRow?.yearlyBook[0] ?? 0, false, false, C.lightGreen),  // L = VNC An1
          numF(`MAX(0,B${er}-K${er}*2)`, depRow?.yearlyBook[1] ?? 0, false, false, C.lightGreen),  // M = VNC An2
          numF(`MAX(0,B${er}-K${er}*3)`, depRow?.yearlyBook[2] ?? 0, false, false, C.lightGreen),  // N = VNC An3
          numF(`MAX(0,B${er}-K${er}*4)`, depRow?.yearlyBook[3] ?? 0, false, false, C.lightGreen),  // O = VNC An4
          numF(`MAX(0,B${er}-K${er}*5)`, depRow?.yearlyBook[4] ?? 0, false, false, C.lightGreen),  // P = VNC An5
          lbl(inv.equipmentType === 'electrique' ? 'Électrique' : 'Non électrique'),               // Q
          lbl(inv.contributionType === 'nature' ? 'Apport en nature' : 'Apport financier'),        // R
        ], r++)
      })

      // TOTAL row — montants + % globaux (16-17 = type équipement/apport, non additionnables : laissées vides)
      {
        const invTotalRow: object[] = Array(18).fill(null).map(() => empty(C.lightGreen))
        invTotalRow[0] = lbl('TOTAL', true, false, C.lightGreen)

        const s = invFirstRow + 1
        const e = r

        // Montant total
        invTotalRow[1] = numF(`SUM(B${s}:B${e})`, totalInvAmount, true, false, C.lightGreen)
        // FP montant + %
        invTotalRow[2] = numF(`SUM(C${s}:C${e})`, totalInvEquity, true, false, C.lightGreen)
        invTotalRow[3] = numPctF(`IF(B${r+1}>0,C${r+1}/B${r+1},0)`,
          totalInvAmount > 0 ? (totalInvEquity / totalInvAmount) * 100 : 0)
        // Emprunt montant + %
        invTotalRow[4] = numF(`SUM(E${s}:E${e})`, totalInvLoan, true, false, C.lightGreen)
        invTotalRow[5] = numPctF(`IF(B${r+1}>0,E${r+1}/B${r+1},0)`,
          totalInvAmount > 0 ? (totalInvLoan / totalInvAmount) * 100 : 0)
        // Subvention montant + %
        invTotalRow[6] = numF(`SUM(G${s}:G${e})`, totalInvGrant, true, false, C.lightGreen)
        invTotalRow[7] = numPctF(`IF(B${r+1}>0,G${r+1}/B${r+1},0)`,
          totalInvAmount > 0 ? (totalInvGrant / totalInvAmount) * 100 : 0)
        // Amort + VNC
        ;[10, 11, 12, 13, 14, 15].forEach(ci => {
          const col = colLetter(ci)
          invTotalRow[ci] = numF(
            `SUM(${col}${s}:${col}${e})`,
            investments.reduce((sum, inv, idx) => {
              if (ci === 10) return sum + (inv.usefulLife > 0 ? Math.round(inv.amount / inv.usefulLife) : 0)
              return sum + (result.depreciationTable.byInvestment[idx]?.yearlyBook[ci - 11] ?? 0)
            }, 0),
            true, false, C.lightGreen,
          )
        })
        const invTotalExcelRow = r + 1   // 1-indexé, avant l'incrément
        setRow(ws, invTotalRow, r++)

        invRefs = { invFirstDataRow: invFirstRow + 1, invCount: investments.length, invTotalExcelRow }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INVESTISSEMENTS NON AMORTIS (Terrain)
    // ══════════════════════════════════════════════════════════════════════════
    let invTerrainRefs = { invTerrainFirstDataRow: 0, invTerrainCount: 0, invTerrainTotalExcelRow: 0 }
    if (investmentTerrains.length > 0) {
      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🌳  INVESTISSEMENTS NON AMORTIS (TERRAIN)')
      merge(ws, r, 0, r, COLS-1); r++

      setRow(ws, [
        hdr('Désignation'),
        hdr('Montant (Ar)'),
      ], r++)

      const invTerrainFirstRow = r
      const totalInvTerrainAmount = investmentTerrains.reduce((s, i) => s + i.amount, 0)

      investmentTerrains.forEach((it) => {
        setRow(ws, [
          lbl(it.name, true),
          num(it.amount),
        ], r++)
      })

      const invTerrainTotalExcelRow = r + 1   // 1-indexé, avant l'incrément
      const s = invTerrainFirstRow + 1
      const e = r
      setRow(ws, [
        lbl('TOTAL', true, false, C.lightGreen),
        numF(`SUM(B${s}:B${e})`, totalInvTerrainAmount, true, false, C.lightGreen),
      ], r++)

      invTerrainRefs = {
        invTerrainFirstDataRow: invTerrainFirstRow + 1,
        invTerrainCount: investmentTerrains.length,
        invTerrainTotalExcelRow,
      }
    }

    ws['!cols'] = [
      { wpx: 200 },
      ...Array(12).fill({ wpx: 52 }),   // mois (qté)
      { wpx: 80 },                       // total qté/an
      ...Array(12).fill({ wpx: 55 }),   // mois (prix)
      { wpx: 100 }, { wpx: 65 }, { wpx: 100 },  // An1, tx2, An2
      { wpx: 65 }, { wpx: 100 },                  // tx3, An3
      { wpx: 65 }, { wpx: 100 },                  // tx4, An4
      { wpx: 65 }, { wpx: 100 },                  // tx5, An5
    ]
    setRange(ws, r, COLS)

    const refs: DataSheetRefs = {
      totalCAExcelRow:      totalCARow + 1,
      totalMatExcelRow:     totalMatRow + 1,
      totalStaffExcelRow:   totalStaffRow + 1,
      totalChargesExcelRow: totalChargesRow + 1,
      prodAnCols,
      matAnCols,
      staffAnCols,
      expAnCols,
      ...invRefs,
      ...invTerrainRefs,
      prodFirstDataRow:  prodFirstRow + 1,  prodDataCount:  products.length,
      matFirstDataRow:   matFirstRow + 1,   matDataCount:   materials.length,
      staffFirstDataRow: staffFirstRow + 1, staffDataCount: staffMembers.length,
      expFirstDataRow:   expFirstRow + 1,   expDataCount:   expenses.length,
    }
    return { ws, refs }
  }

  // Cas sans données : feuille vide avec note
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = { v: 'Aucune donnée à afficher.', t: 's', s: { font: { sz: 11, italic: true } } }
  setRange(ws, r + 1, 6)
  return {
    ws,
    refs: {
      totalCAExcelRow: 3, totalMatExcelRow: 4, totalStaffExcelRow: 5, totalChargesExcelRow: 6,
      prodAnCols: [15,17,19,21,23], matAnCols: [15,17,19,21,23],
      staffAnCols: [4,6,8,10,12], expAnCols: [26,28,30,32,34],
      invFirstDataRow: 0, invCount: 0, invTotalExcelRow: 0,
      invTerrainFirstDataRow: 0, invTerrainCount: 0, invTerrainTotalExcelRow: 0,
      prodFirstDataRow: 0, prodDataCount: 0,
      matFirstDataRow: 0,  matDataCount: 0,
      staffFirstDataRow: 0, staffDataCount: 0,
      expFirstDataRow: 0,  expDataCount: 0,
    },
  }
}


// ─── Feuille 3 : Compte de résultat ──────────────────────────────────────────
function buildIncomeSheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  refs: DataSheetRefs,
  settings?: { taxRegime: string; taxRate: number; taxRateIs: number },
): { ws: Record<string,unknown>; incomeRefs: IncomeSheetRefs } {
  const IS = result.incomeStatement
  const R  = result.profitabilityRatios
  const ws: Record<string,unknown> = {}
  const COLS = 6
  let r = 0
  r = titleBlock(ws, companyName, 'COMPTE DE RÉSULTAT PRÉVISIONNEL (en Ar)', COLS, r)
  // r = 2

  setRow(ws, [hdr('Libellé'), ...YEARS.map(y => hdr(y))], r++)

  
  const rCA   = r;   r++ // Excel row rCA+1
  const rMat  = r;   r++ // Excel row rMat+1
  const rMB   = r;   r++ // Marge brute = CA − Mat
  const rMBpct= r;   r++ // Marge brute %
  const rSta  = r;   r++ // Personnel
  const rExp  = r;   r++ // Charges d'exploitation
  const rEBIT = r;   r++ // EBITDA (libellé = EBITDA)
  const rEBITpct=r;  r++ // EBITDA margin %
  const rDep  = r;   r++ // Amortissements
  const rEBIT2= r;   r++ // EBIT
  const rInt  = r;   r++ // Intérêts
  const rEBT  = r;   r++ // Résultat avant impôt
  const rTax  = r;   r++ // Impôts
  const rNI   = r;   r++ // Résultat net
  const rNIpct= r;   r++ // Marge nette %

  // Colonnes données : B (An1) = index 1, C=2, D=3, E=4, F=5
  // Pour l'année i (0-basé), col Excel = colLetter(1+i), Excel row = rXxx+1

  // Helper : formule de référence croisée vers 'Données de base' pour l'année yi
  const dbRef = (totalExcelRow: number, anCols: number[], yi: number) =>
    `'Données de base'!${colLetter(anCols[yi])}${totalExcelRow}`

  // Helper : adresse locale dans cette feuille
  function local(rowIdx: number, yi: number) { return cellAddr(rowIdx, 1 + yi) }

  // ── Chiffre d'affaires ────────────────────────────────────────────────────
  setRow(ws, [
    lbl("Chiffre d'affaires", true, false, C.lightGreen),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(dbRef(refs.totalCAExcelRow, refs.prodAnCols, yi), IS.revenueByYear[yi], true, false, C.lightGreen),
    ),
  ], rCA)

  // ── Coût des matières ─────────────────────────────────────────────────────
  setRow(ws, [
    lbl('− Coût des matières', false, false),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(dbRef(refs.totalMatExcelRow, refs.matAnCols, yi), IS.materialCostByYear[yi]),
    ),
  ], rMat)

  // ── Marge brute = CA − Matières ───────────────────────────────────────────
  setRow(ws, [
    lbl('= Marge brute', true, false, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${local(rCA,yi)}-${local(rMat,yi)}`, IS.grossMarginByYear[yi], true, false, C.lightGray),
    ),
  ], rMB)

  // ── Marge brute % ─────────────────────────────────────────────────────────
  setRow(ws, [
    lbl('Marge brute %', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numPctF(`IF(${local(rCA,yi)}<>0,${local(rMB,yi)}/${local(rCA,yi)},0)`, R.grossMarginPctByYear[yi]),
    ),
  ], rMBpct)

  // ── Personnel ─────────────────────────────────────────────────────────────
  setRow(ws, [
    lbl('− Charges de personnel', false, false),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(dbRef(refs.totalStaffExcelRow, refs.staffAnCols, yi), IS.staffCostByYear[yi]),
    ),
  ], rSta)

  // ── Charges d'exploitation ────────────────────────────────────────────────
  setRow(ws, [
    lbl("− Charges d'exploitation", false, false),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(dbRef(refs.totalChargesExcelRow, refs.expAnCols, yi), IS.expenseCostByYear[yi]),
    ),
  ], rExp)

  // ── EBITDA = Marge brute − Personnel − Charges ───────────────────────────
  setRow(ws, [
    lbl('= EBITDA', true, false, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${local(rMB,yi)}-${local(rSta,yi)}-${local(rExp,yi)}`, IS.ebitdaByYear[yi], true, false, C.lightGray),
    ),
  ], rEBIT)

  // ── EBITDA margin % ───────────────────────────────────────────────────────
  setRow(ws, [
    lbl('EBITDA margin %', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numPctF(`IF(${local(rCA,yi)}<>0,${local(rEBIT,yi)}/${local(rCA,yi)},0)`, R.ebitdaMarginPctByYear[yi]),
    ),
  ], rEBITpct)

  // ── Amortissements ────────────────────────────────────────────────────────
  setRow(ws, [
    lbl('− Amortissements', false, false),
    ...IS.depreciationByYear.map(v => num(v)),
  ], rDep)

  // ── EBIT = EBITDA − Amortissements ───────────────────────────────────────
  setRow(ws, [
    lbl('= EBIT', true, false, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${local(rEBIT,yi)}-${local(rDep,yi)}`, IS.ebitByYear[yi], true, false, C.lightGray),
    ),
  ], rEBIT2)

  // ── Intérêts ──────────────────────────────────────────────────────────────
  setRow(ws, [
    lbl("− Intérêts d'emprunt", false, false),
    ...IS.interestByYear.map(v => num(v)),
  ], rInt)

  // ── Résultat avant impôt = EBIT − Intérêts ───────────────────────────────
  setRow(ws, [
    lbl('= Résultat avant impôt', true, false, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${local(rEBIT2,yi)}-${local(rInt,yi)}`, IS.ebtByYear[yi], true, false, C.lightGray),
    ),
  ], rEBT)

  // ── Impôts — formule selon le régime fiscal ───────────────────────────────
  // IS : base = CA × taux_IS  |  IR : base = MAX(0, EBT) × taux_IR
  setRow(ws, [
    lbl('− Impôts', false, false),
    ...Array.from({ length: 5 }, (_, yi) => {
      const v = IS.taxByYear[yi]
      if (!settings) return num(v)
      const caCell  = local(rCA,  yi)
      const ebtCell = local(rEBT, yi)
      const formula = settings.taxRegime === 'IS'
        ? `${caCell}*${settings.taxRateIs / 100}`
        : `IF(${ebtCell}>0,${ebtCell}*${settings.taxRate / 100},0)`
      return numF(formula, v)
    }),
  ], rTax)

  // ── Résultat net = Résultat avant impôt − Impôts ─────────────────────────
  setRow(ws, [
    lbl('= Résultat net', true, false, C.lightGreen),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${local(rEBT,yi)}-${local(rTax,yi)}`, IS.netIncomeByYear[yi], true, true, C.lightGreen),
    ),
  ], rNI)

  // ── Marge nette % ─────────────────────────────────────────────────────────
  setRow(ws, [
    lbl('Marge nette %', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numPctF(`IF(${local(rCA,yi)}<>0,${local(rNI,yi)}/${local(rCA,yi)},0)`, R.netMarginPctByYear[yi], false, true),
    ),
  ], rNIpct)

  ws['!cols'] = [230, 110, 110, 110, 110, 110].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  return { ws, incomeRefs: { rCA, rMat, rMB, rSta, rExp, rEBIT, rDep, rEBIT2, rInt, rEBT, rTax, rNI } }
}

// ─── Feuille 4 : Trésorerie 5 ans ────────────────────────────────────────────
function buildCashFlowSheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  incomeRefs: IncomeSheetRefs,
  investments: Investment[],
  additionalFundings: AdditionalFunding[],
  dataRefs: DataSheetRefs,
): { ws: Record<string,unknown>; cfRefs: CashFlowSheetRefs } {
  const CF = result.cashFlowStatement
  const ws: Record<string,unknown> = {}
  const COLS = 6
  let r = 0
  r = titleBlock(ws, companyName, 'TABLEAU DE FLUX DE TRÉSORERIE (en Ar)', COLS, r)

  setRow(ws, [hdr('Libellé'), ...YEARS.map(y => hdr(y))], r++)

  // ── Pré-calcul : financement initial vs apports complémentaires ───────────
  const initEquity = investments.reduce((s, i) => s + i.financedEquity, 0)
  const initLoan   = investments.reduce((s, i) => s + i.financedLoan, 0)
  const initGrant  = investments.reduce((s, i) => s + i.financedGrant, 0)
  const initTotal  = initEquity + initLoan + initGrant

  const getAF = (yr: number) => additionalFundings.find(f => f.yearNumber === yr)
  const afEquity = Array.from({ length: 5 }, (_, y) => getAF(y + 1)?.equity ?? 0)
  const afLoan   = Array.from({ length: 5 }, (_, y) => getAF(y + 1)?.loan   ?? 0)
  const afGrant  = Array.from({ length: 5 }, (_, y) => getAF(y + 1)?.grant  ?? 0)
  const afTotal  = Array.from({ length: 5 }, (_, y) => afEquity[y] + afLoan[y] + afGrant[y])

  const bfr = CF.cumulativeCashByYear[0] - CF.netCashByYear[0]

  // ── 1. FLUX OPÉRATIONNEL ──────────────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr('📊  FLUX OPÉRATIONNEL')
  merge(ws, r, 0, r, COLS-1); r++

  const rNI  = r
  setRow(ws, [
    lbl('Résultat net', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(xRef('Compte de résultat', incomeRefs.rNI, yi), CF.netIncomeByYear[yi]),
    ),
  ], r++)

  const rDep = r
  setRow(ws, [
    lbl('+ Amortissements', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(xRef('Compte de résultat', incomeRefs.rDep, yi), CF.depreciationByYear[yi]),
    ),
  ], r++)

  const rCAF = r
  setRow(ws, [
    lbl('= CAF (flux opérationnel)', true, false, C.lightGreen),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${cellAddr(rNI,1+yi)}+${cellAddr(rDep,1+yi)}`, CF.operatingCashFlowByYear[yi], true, false, C.lightGreen),
    ),
  ], r++)
  r++

  // ── 2. FLUX D'INVESTISSEMENT ──────────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr("🏗️  FLUX D'INVESTISSEMENT")
  merge(ws, r, 0, r, COLS-1); r++

  const rInv = r
  const hasInvRefs = dataRefs.invCount > 0
  setRow(ws, [
    lbl('− Investissements totaux', false, true),
    // An 1 → référence total montant dans Données de base; An 2-5 = 0
    hasInvRefs
      ? numF(`'Données de base'!B${dataRefs.invTotalExcelRow}`, CF.investmentByYear[0])
      : num(CF.investmentByYear[0]),
    ...CF.investmentByYear.slice(1).map(v => num(v)),
  ], r++)
  r++

  // ── 3. FINANCEMENT INITIAL (An 1) ─────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr('💰  FINANCEMENT INITIAL (An 1)', C.primaryLt)
  merge(ws, r, 0, r, COLS-1); r++

  const rInitEq = r
  setRow(ws, [lbl('+ Fonds propres initiaux', false, true),
    hasInvRefs ? numF(`'Données de base'!C${dataRefs.invTotalExcelRow}`, initEquity) : num(initEquity),
    ...Array(4).fill(empty())], r++)
  const rInitLoan = r
  setRow(ws, [lbl('+ Emprunts initiaux', false, true),
    hasInvRefs ? numF(`'Données de base'!E${dataRefs.invTotalExcelRow}`, initLoan) : num(initLoan),
    ...Array(4).fill(empty())], r++)
  const rInitGrant = r
  setRow(ws, [lbl('+ Subventions initiales', false, true),
    hasInvRefs ? numF(`'Données de base'!G${dataRefs.invTotalExcelRow}`, initGrant) : num(initGrant),
    ...Array(4).fill(empty())], r++)
  const rInitTotal = r
  setRow(ws, [
    lbl('= Total financement initial', true, false, C.lightGreen),
    numF(`${cellAddr(rInitEq,1)}+${cellAddr(rInitLoan,1)}+${cellAddr(rInitGrant,1)}`, initTotal, true, false, C.lightGreen),
    ...Array(4).fill(empty(C.lightGreen)),
  ], r++)

  const rInitBfr = r
  setRow(ws, [lbl('+ Fonds de roulement initial', false, true, C.lightBlue),
    num(bfr, false, false, C.lightBlue),
    ...Array(4).fill(empty())], r++)
  r++

  // ── 4. APPORTS COMPLÉMENTAIRES (An 1-5) ───────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr('📈  APPORTS COMPLÉMENTAIRES (An 1-5)', C.orange)
  merge(ws, r, 0, r, COLS-1); r++

  const rAFEq = r
  setRow(ws, [
    lbl('+ Fonds propres additionnels', false, true),
    ...afEquity.map(v => num(v, false, false, v > 0 ? C.lightGreen : undefined)),
  ], r++)

  const rAFLoan = r
  setRow(ws, [
    lbl('+ Emprunts additionnels', false, true),
    ...afLoan.map(v => num(v, false, false, v > 0 ? C.lightBlue : undefined)),
  ], r++)

  const rAFGrant = r
  setRow(ws, [
    lbl('+ Subventions additionnelles', false, true),
    ...afGrant.map(v => num(v, false, false, v > 0 ? C.lightGray : undefined)),
  ], r++)

  const rAFTotal = r
  setRow(ws, [
    lbl('= Total apports complémentaires', true, false, C.lightGreen),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `${cellAddr(rAFEq,1+yi)}+${cellAddr(rAFLoan,1+yi)}+${cellAddr(rAFGrant,1+yi)}`,
        afTotal[yi], true, false, C.lightGreen,
      ),
    ),
  ], r++)
  r++

  // ── 5. REMBOURSEMENTS D'EMPRUNTS ──────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr('🔄  REMBOURSEMENTS D\'EMPRUNTS')
  merge(ws, r, 0, r, COLS-1); r++

  const rRemb = r
  setRow(ws, [
    lbl('− Remboursements capital', false, true),
    ...CF.loanRepaymentByYear.map(v => num(v)),
  ], r++)
  r++

  // ── 6. SOLDE DE TRÉSORERIE ────────────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = subHdr('💧  SOLDE DE TRÉSORERIE')
  merge(ws, r, 0, r, COLS-1); r++

  // Trésorerie nette An1 = CAF − Invest + FinancInit + AportComp − Remb
  // Trésorerie nette An2-5 = CAF + AportComp − Remb
  const rNet = r
  setRow(ws, [
    lbl('= Trésorerie nette annuelle', true),
    ...Array.from({ length: 5 }, (_, yi) => {
      const formula = yi === 0
        ? `${cellAddr(rCAF,1)}-${cellAddr(rInv,1)}+${cellAddr(rInitTotal,1)}+${cellAddr(rAFTotal,1)}-${cellAddr(rRemb,1)}`
        : `${cellAddr(rCAF,1+yi)}+${cellAddr(rAFTotal,1+yi)}-${cellAddr(rRemb,1+yi)}`
      return numF(formula, CF.netCashByYear[yi], true, true, C.lightGreen)
    }),
  ], r++)

  const rCumul = r
  setRow(ws, [
    lbl("Trésorerie cumulée fin d'an", true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `${cellAddr(rInitBfr,1)}+SUM(${cellAddr(rNet,1)}:${cellAddr(rNet,1+yi)})`,
        CF.cumulativeCashByYear[yi],
        true, true, C.lightGreen,
      ),
    ),
  ], r++)

  ws['!cols'] = [240, 110, 110, 110, 110, 110].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  return { ws, cfRefs: { rCAF, rNet, rCumul, rRemb, rAFTotal, rInitEq, rInitGrant, rInitBfr, rAFEq, rAFGrant } }
}

// ─── Feuille 5 : Trésorerie mensuelle An 1 ───────────────────────────────────
function buildMonthlySheet(
  result: ReturnType<typeof computeAll>,
  products: Product[],
  materials: Material[],
  staffMembers: StaffMember[],
  expenses: Expense[],
  additionalFundings: AdditionalFunding[],
  settings: CompanySettings,
  investments: Investment[],
  companyName: string,
  incomeRefs: IncomeSheetRefs,
  cfRefs: CashFlowSheetRefs,
  dataRefs: DataSheetRefs,
): Record<string,unknown> {
  const ws: Record<string,unknown> = {}
  const COLS = 14
  let r = 0
  r = titleBlock(ws, companyName, 'TRÉSORERIE MENSUELLE - ANNÉE 1 (en Ar)', COLS, r)

  const invEquity = investments.reduce((s,i) => s + i.financedEquity, 0)
  const invLoan   = investments.reduce((s,i) => s + i.financedLoan, 0)
  const invGrant  = investments.reduce((s,i) => s + i.financedGrant, 0)
  const invTotal  = investments.reduce((s,i) => s + i.amount, 0)
  const fdr       = settings.fondsRoulement ?? 0
  const tresoInitiale = invEquity + invLoan + invGrant - invTotal + fdr

  const monthly = buildMonthlyCashFlow(
    products, materials, staffMembers, expenses,
    result.incomeStatement, result.loanRepaymentTable,
    additionalFundings, tresoInitiale,
  )

  // Trésorerie initiale — formule si investissements dans Données de base
  const hasInv = dataRefs.invCount > 0
  const tresoFormula = hasInv
    ? `'Données de base'!C${dataRefs.invTotalExcelRow}+'Données de base'!E${dataRefs.invTotalExcelRow}+'Données de base'!G${dataRefs.invTotalExcelRow}-'Données de base'!B${dataRefs.invTotalExcelRow}+${fdr}`
    : null

  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = lbl(`Trésorerie initiale (An 0) : ${formatAriary(tresoInitiale)}`, true, false, C.lightBlue)
  merge(ws, r, 0, r, COLS-1); r++
  r++

  setRow(ws, [hdr('Poste'), ...MONTHS.map(m => hdr(m)), hdr('TOTAL An 1')], r++)

  // ── Lignes de données ─────────────────────────────────────────────────────
  const rEncaiss = r
  {
    const hasProds = dataRefs.prodDataCount > 0
    const pFirst   = dataRefs.prodFirstDataRow
    const pLast    = pFirst + dataRefs.prodDataCount - 1
    setRow(ws, [
      lbl('Encaissements (CA)', true, false, C.lightGreen),
      // SUMPRODUCT(qté mois × prix mois) sur toutes les lignes produits dans Données de base
      ...Array.from({ length: 12 }, (_, m) => {
        if (hasProds) {
          const qCol = colLetter(1 + m)   // B=Jan … M=Déc
          const pCol = colLetter(14 + m)  // O=Jan … Z=Déc
          return numF(
            `SUMPRODUCT('Données de base'!${qCol}${pFirst}:'Données de base'!${qCol}${pLast},'Données de base'!${pCol}${pFirst}:'Données de base'!${pCol}${pLast})`,
            monthly.encaissements[m], false, false, C.lightGreen,
          )
        }
        return num(monthly.encaissements[m], false, false, C.lightGreen)
      }),
      numF(`SUM(${cellAddr(rEncaiss,1)}:${cellAddr(rEncaiss,12)})`, monthly.encaissements.reduce((a,b)=>a+b,0), true, false, C.lightGreen),
    ], r++)
  }

  const rCoutsVar = r
  {
    const hasMats = dataRefs.matDataCount > 0
    const mFirst  = dataRefs.matFirstDataRow
    const mLast   = mFirst + dataRefs.matDataCount - 1
    setRow(ws, [
      lbl('− Coûts variables (matières)', false, true),
      // SUMPRODUCT(qté mois × coût unitaire mois) sur toutes les lignes matières dans Données de base
      ...Array.from({ length: 12 }, (_, m) => {
        if (hasMats) {
          const qCol = colLetter(1 + m)   // B=Jan … M=Déc
          const cCol = colLetter(14 + m)  // O=Jan … Z=Déc
          return numF(
            `SUMPRODUCT('Données de base'!${qCol}${mFirst}:'Données de base'!${qCol}${mLast},'Données de base'!${cCol}${mFirst}:'Données de base'!${cCol}${mLast})`,
            monthly.coutsVariables[m],
          )
        }
        return num(monthly.coutsVariables[m])
      }),
      numF(`SUM(${cellAddr(rCoutsVar,1)}:${cellAddr(rCoutsVar,12)})`, monthly.coutsVariables.reduce((a,b)=>a+b,0)),
    ], r++)
  }

  const rPersonnel = r
  // Personnel mensuel = SUM des coûts An1 staff / 12 (col E = index 4 dans Données de base)
  const personnelFormula = dataRefs.staffDataCount > 0
    ? `SUM('Données de base'!E${dataRefs.staffFirstDataRow}:E${dataRefs.staffFirstDataRow + dataRefs.staffDataCount - 1})/12`
    : '0'
  const personnelVal = monthly.personnelMensuel
  setRow(ws, [
    lbl('− Charges de personnel', false, true),
    ...Array.from({ length: 12 }, () => numF(personnelFormula, personnelVal)),
    numF(`${personnelFormula}*12`, personnelVal * 12),
  ], r++)

  const rCharges = r
  {
    const hasExps = dataRefs.expDataCount > 0
    const eFirst  = dataRefs.expFirstDataRow
    const eLast   = eFirst + dataRefs.expDataCount - 1
    setRow(ws, [
      lbl("− Charges d'exploitation", false, true),
      // SUMPRODUCT(quantité mois × montant mois) sur toutes les lignes charges dans Données de base
      ...Array.from({ length: 12 }, (_, m) => {
        if (hasExps) {
          const qCol = colLetter(1 + m)   // B=Jan … M=Déc
          const aCol = colLetter(14 + m)  // O=Jan … Z=Déc
          return numF(
            `SUMPRODUCT('Données de base'!${qCol}${eFirst}:'Données de base'!${qCol}${eLast},'Données de base'!${aCol}${eFirst}:'Données de base'!${aCol}${eLast})`,
            monthly.autresCharges[m],
          )
        }
        return num(monthly.autresCharges[m])
      }),
      numF(`SUM(${cellAddr(rCharges,1)}:${cellAddr(rCharges,12)})`, monthly.autresCharges.reduce((a,b)=>a+b,0)),
    ], r++)
  }

  const rImpots = r
  // Impôts mensuels = impôts An1 (Compte de résultat) / 12
  const impotsFormula = `'Compte de résultat'!B${incomeRefs.rTax+1}/12`
  setRow(ws, [
    lbl('− Impôts & taxes', false, true),
    ...Array.from({ length: 12 }, () => numF(impotsFormula, monthly.impotMensuel)),
    numF(`'Compte de résultat'!B${incomeRefs.rTax+1}`, monthly.impotMensuel * 12),
  ], r++)

  const rFrais = r
  // Frais financiers = intérêts An1 / 12
  const fraisFormula = `'Compte de résultat'!B${incomeRefs.rInt+1}/12`
  setRow(ws, [
    lbl('− Frais financiers', false, true),
    ...Array.from({ length: 12 }, () => numF(fraisFormula, monthly.fraisFinanciersMensuel)),
    numF(`'Compte de résultat'!B${incomeRefs.rInt+1}`, monthly.fraisFinanciersMensuel * 12),
  ], r++)

  const rRemb = r
  // Remboursement capital = remboursements An1 (Trésorerie 5 ans) / 12
  const rembFormula = `'Trésorerie 5 ans'!B${cfRefs.rRemb+1}/12`
  setRow(ws, [
    lbl('− Remboursement capital', false, true),
    ...Array.from({ length: 12 }, () => numF(rembFormula, monthly.rembCapitalMensuel)),
    numF(`'Trésorerie 5 ans'!B${cfRefs.rRemb+1}`, monthly.rembCapitalMensuel * 12),
  ], r++)

  const rApports = r
  // Apports complémentaires An1 → versés en janvier, 0 autres mois
  // Référence : Trésorerie 5 ans, ligne Total apports complémentaires, An1
  const apportJanFormula = `'Trésorerie 5 ans'!B${cfRefs.rAFTotal+1}`
  setRow(ws, [
    lbl('+ Apports complémentaires', false, true),
    numF(apportJanFormula, monthly.apportMois[0]),
    ...Array.from({ length: 11 }, () => num(0)),
    numF(apportJanFormula, monthly.apportMois[0]),
  ], r++)

  // ── Solde mensuel net (formule locale) ────────────────────────────────────
  const rSolde = r
  setRow(ws, [
    lbl('= Solde mensuel net', true, false, C.lightGray),
    ...Array.from({ length: 12 }, (_, m) => {
      const col = colLetter(1 + m)
      const er = (rowIdx: number) => `${col}${rowIdx + 1}`
      const formula = `${er(rEncaiss)}-${er(rCoutsVar)}-${er(rPersonnel)}-${er(rCharges)}-${er(rImpots)}-${er(rFrais)}-${er(rRemb)}+${er(rApports)}`
      return numF(formula, monthly.soldeMensuel[m], true, true, C.lightGray)
    }),
    numF(`SUM(${cellAddr(rSolde,1)}:${cellAddr(rSolde,12)})`, monthly.soldeMensuel.reduce((a,b)=>a+b,0), true, true, C.lightGray),
  ], r++)

  // ── Trésorerie cumulée ────────────────────────────────────────────────────
  const rCumul = r
  setRow(ws, [
    lbl('Trésorerie cumulée', true, false, C.lightGreen),
    // Jan : tresoInitiale + Solde Jan
    numF(
      tresoFormula
        ? `(${tresoFormula})+${cellAddr(rSolde,1)}`
        : `${tresoInitiale}+${cellAddr(rSolde,1)}`,
      monthly.soldeCumule[0], true, true, C.lightGreen,
    ),
    // Fév-Déc : cumul précédent + solde mois
    ...Array.from({ length: 11 }, (_, m) =>
      numF(
        `${cellAddr(rCumul, 1+m)}+${cellAddr(rSolde, 2+m)}`,
        monthly.soldeCumule[m + 1], true, true, C.lightGreen,
      )
    ),
    // TOTAL = dernière trésorerie cumulée (Dec)
    numF(cellAddr(rCumul, 12), monthly.soldeCumule[11], true, true, C.lightGreen),
  ], r++)

  ws['!cols'] = [200, ...Array(12).fill(80), 100].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  return ws
}

// ─── Feuille 6 : Bilan ───────────────────────────────────────────────────────
function buildBalanceSheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  investments: Investment[],
  incomeRefs: IncomeSheetRefs,
  cfRefs: CashFlowSheetRefs,
  dataRefs: DataSheetRefs,
  investmentTerrains: InvestmentTerrain[] = [],
  settings?: CompanySettings,
): Record<string,unknown> {
  const totalInvestTerrain = investmentTerrains.reduce((s, i) => s + i.amount, 0)
  const bfr = settings?.fondsRoulement ?? 0
  const BS  = result.balanceSheet
  const IS  = result.incomeStatement
  const ws: Record<string,unknown> = {}
  const COLS = 6
  let r = 0
  r = titleBlock(ws, companyName, 'BILAN PRÉVISIONNEL (en Ar)', COLS, r)

  setRow(ws, [hdr('Rubrique'), ...YEARS.map(y => hdr(y))], r++)

  // ── ACTIF ─────────────────────────────────────────────────────────────────
  const invTotal  = investments.reduce((s, i) => s + i.amount, 0)
  void invTotal
  const netFixed  = Array.from({ length: 5 }, (_, y) =>
    result.depreciationTable.byInvestment.reduce((sum, row) => sum + (row.yearlyBook[y] ?? 0), 0),
  )
  const cashByYear = BS.cashByYear
  const totalActif = Array.from({ length: 5 }, (_, y) => netFixed[y] + totalInvestTerrain + Math.max(0, cashByYear[y]))

  const hasInvRefs = dataRefs.invCount > 0
  const s = dataRefs.invFirstDataRow
  const e = hasInvRefs ? dataRefs.invFirstDataRow + dataRefs.invCount - 1 : 0

  const rActifStart = r
  setRow(ws, [sectionRow('ACTIF'), ...YEARS.map(() => empty(C.primary))], r++)
  const rNetFixed = r
  // VNC An1-5 → SUM colonne L..P dans Données de base (si dispo) sinon valeur
  setRow(ws, [
    lbl('Immobilisations nettes (VNC)', false, true),
    ...Array.from({ length: 5 }, (_, y) =>
      hasInvRefs
        ? numF(`SUM('Données de base'!${colLetter(11+y)}${s}:'Données de base'!${colLetter(11+y)}${e})`, netFixed[y])
        : num(netFixed[y])
    ),
  ], r++)
  const rInvTerrain = totalInvestTerrain > 0 ? r : -1
  if (totalInvestTerrain > 0) {
    const hasInvTerrainRefs = dataRefs.invTerrainCount > 0
    setRow(ws, [
      lbl('Total investissement non amorti', false, true),
      ...Array(5).fill(
        hasInvTerrainRefs
          ? numF(`'Données de base'!B${dataRefs.invTerrainTotalExcelRow}`, totalInvestTerrain)
          : num(totalInvestTerrain),
      ),
    ], r++)
  }
  const rCash = r
  // Trésorerie → référence 'Trésorerie 5 ans' trésorerie cumulée
  setRow(ws, [
    lbl('Trésorerie', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(xRef('Trésorerie 5 ans', cfRefs.rCumul, yi), cashByYear[yi], false, cashByYear[yi] < 0),
    ),
  ], r++)
  const rTotalActif = r
  setRow(ws, [
    lbl('= TOTAL ACTIF', true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        rInvTerrain >= 0
          ? `${cellAddr(rNetFixed,1+yi)}+${cellAddr(rInvTerrain,1+yi)}+MAX(0,${cellAddr(rCash,1+yi)})`
          : `${cellAddr(rNetFixed,1+yi)}+MAX(0,${cellAddr(rCash,1+yi)})`,
        totalActif[yi], true, false, C.lightGreen,
      ),
    ),
  ], r++)
  r++
  const CF = result.cashFlowStatement
  const cumEquity: number[] = CF.equityByYear.reduce<number[]>((acc, v, y) => {
    acc.push((acc[y - 1] ?? 0) + v)
    return acc
  }, [])
  const cumGrant: number[] = CF.grantByYear.reduce<number[]>((acc, v, y) => {
    acc.push((acc[y - 1] ?? 0) + v)
    return acc
  }, [])
  const cumResult: number[] = IS.netIncomeByYear.reduce<number[]>((acc, _, y) => {
    acc.push((acc[y - 1] ?? 0) + (y > 0 ? IS.netIncomeByYear[y - 1] : 0))
    return acc
  }, [])

  // Capitaux propres = Capital cumulé (FP + subventions) + terrain non amorti + BFR initial + résultats cumulés
  const capitalPropres = Array.from({ length: 5 }, (_, y) =>
    cumEquity[y] + cumGrant[y] + totalInvestTerrain + bfr + cumResult[y] + IS.netIncomeByYear[y],
  )
  const dettes      = BS.loanBalanceByYear
  const totalPassif = Array.from({ length: 5 }, (_, y) => capitalPropres[y] + Math.max(0, dettes[y]))

  setRow(ws, [sectionRow('PASSIF'), ...YEARS.map(() => empty(C.primary))], r++)
  const rCapPropres = r
  // Capitaux propres = (cumEquity+cumGrant+totalInvestTerrain+bfr à l'année Y) + SUM(Résultat net An1..AnY)
  setRow(ws, [
    lbl('Capitaux propres', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `(${cumEquity[yi] + cumGrant[yi] + totalInvestTerrain + bfr})+SUM('Compte de résultat'!B${incomeRefs.rNI+1}:${colLetter(1+yi)}${incomeRefs.rNI+1})`,
        capitalPropres[yi], false, capitalPropres[yi] < 0,
      ),
    ),
  ], r++)
  if (totalInvestTerrain > 0) {
    setRow(ws, [
      lbl('dont Total investissement non amorti', false, true),
      ...Array(5).fill(num(totalInvestTerrain)),
    ], r++)
  }
  if (bfr > 0) {
    setRow(ws, [
      lbl('dont Fonds de roulement initial', false, true),
      ...Array(5).fill(num(bfr)),
    ], r++)
  }
  const rDettes = r
  setRow(ws, [lbl('Dettes financières', false, true), ...dettes.map(v => num(v))], r++)
  const rTotalPassif = r
  setRow(ws, [
    lbl('= TOTAL PASSIF', true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${cellAddr(rCapPropres,1+yi)}+MAX(0,${cellAddr(rDettes,1+yi)})`, totalPassif[yi], true, false, C.lightGreen),
    ),
  ], r++)
  r++
  const ecarts = totalActif.map((a, i) => a - totalPassif[i])
  setRow(ws, [
    lbl('Écart Actif − Passif', false, true, C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) => {
      const v = ecarts[yi]
      return {
        f: `${cellAddr(rTotalActif,1+yi)}-${cellAddr(rTotalPassif,1+yi)}`,
        v: Math.abs(v) < 100 ? 0 : v,
        t: 'n', z: '#,##0',
        s: {
          font: { sz: 10, bold: false, color: { rgb: Math.abs(v) < 100 ? C.success : C.danger } },
          fill: { fgColor: { rgb: C.lightGray } },
          alignment: { horizontal: 'center' },
          border: allBorder(),
        },
      }
    }),
  ], r++)
  r++

  // ── Détail capitaux propres ───────────────────────────────────────────────
  setRow(ws, [sectionRow('DÉTAIL DES CAPITAUX PROPRES'), ...YEARS.map(() => empty(C.primary))], r++)
  setRow(ws, [hdr('Rubrique'), ...YEARS.map(y => hdr(y))], r++)

  // Fonds propres cumulés — FP initiaux (Trésorerie 5 ans col B) + cumul apports FP col B..yi
  const rDetailFP = r
  setRow(ws, [lbl('Fonds propres cumulés (+ apports complémentaires)', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `'Trésorerie 5 ans'!B${cfRefs.rInitEq+1}+SUM('Trésorerie 5 ans'!B${cfRefs.rAFEq+1}:'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rAFEq+1})`,
        cumEquity[yi],
      ),
    )], r++)

  // Subventions cumulées — subventions initiales + cumul apports subventions col B..yi
  setRow(ws, [lbl('Subventions cumulées', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `'Trésorerie 5 ans'!B${cfRefs.rInitGrant+1}+SUM('Trésorerie 5 ans'!B${cfRefs.rAFGrant+1}:'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rAFGrant+1})`,
        cumGrant[yi],
      ),
    )], r++)

  if (totalInvestTerrain > 0) {
    const hasTerrainR = dataRefs.invTerrainCount > 0
    setRow(ws, [lbl('Total investissement non amorti', false, true),
      ...Array(5).fill(
        hasTerrainR
          ? numF(`'Données de base'!B${dataRefs.invTerrainTotalExcelRow}`, totalInvestTerrain)
          : num(totalInvestTerrain)
      )], r++)
  }
  if (bfr > 0) {
    // BFR = ligne "Fonds de roulement initial" dans Trésorerie 5 ans col B
    setRow(ws, [lbl('Fonds de roulement initial', false, true),
      ...Array(5).fill(numF(`'Trésorerie 5 ans'!B${cfRefs.rInitBfr+1}`, bfr))], r++)
  }
  // Résultats antérieurs cumulés → SUM NI jusqu'à An(Y-1) depuis 'Compte de résultat'
  setRow(ws, [
    lbl('Résultats antérieurs cumulés', false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      yi === 0
        ? num(0)
        : numF(
            `SUM('Compte de résultat'!B${incomeRefs.rNI+1}:${colLetter(yi)}${incomeRefs.rNI+1})`,
            cumResult[yi],
          ),
    ),
  ], r++)
  // Résultat de l'exercice → référence directe 'Compte de résultat'
  const rDetailResultEx = r
  setRow(ws, [
    lbl("Résultat de l'exercice", false, true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(xRef('Compte de résultat', incomeRefs.rNI, yi), IS.netIncomeByYear[yi], false, IS.netIncomeByYear[yi] < 0),
    ),
  ], r++)

  // Total CP = SUM de toutes les lignes de détail (de rDetailFP jusqu'à rDetailResultEx inclus)
  const rDetailTotalCP = r
  setRow(ws, [
    lbl('= Total capitaux propres', true),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `SUM(${cellAddr(rDetailFP, 1+yi)}:${cellAddr(rDetailResultEx, 1+yi)})`,
        capitalPropres[yi], true, capitalPropres[yi] < 0, C.lightGreen,
      ),
    ),
  ], r++)

  // Mise à jour rétroactive de la ligne "Capitaux propres" dans le PASSIF
  // pour qu'elle referencie le total calculé ici plutôt qu'une valeur figée
  Array.from({ length: 5 }, (_, yi) => {
    ws[XLSXStyle.utils.encode_cell({ r: rCapPropres, c: 1+yi })] = numF(
      cellAddr(rDetailTotalCP, 1+yi), capitalPropres[yi], false, capitalPropres[yi] < 0,
    )
  })
  // track rActifStart to silence unused-var lint
  void rActifStart
  r++

  // ── Détail dettes financières ─────────────────────────────────────────────
  const LOAN = result.loanRepaymentTable
  if (LOAN.byLoan.length > 0) {
    const DCOLS = 10 // Emprunt | Principal | Taux | Durée | An1..An5
    setRow(ws, [sectionRow('DÉTAIL DES DETTES FINANCIÈRES'), ...Array(DCOLS - 1).fill(empty(C.primary))], r++)
    setRow(ws, [
      hdr('Emprunt'), hdr('Principal (Ar)'), hdr('Taux %'), hdr('Durée'),
      ...YEARS.map(y => hdr(`Solde ${y}`)),
    ], r++)

    const loanFirstRow = r
    LOAN.byLoan.forEach(loan => {
      setRow(ws, [
        lbl(loan.label, true),
        num(loan.principal),
        { v: loan.rate / 100, t: 'n', z: '0.0%', s: { font: { sz: 10 }, fill: { fgColor: { rgb: C.white } }, alignment: { horizontal: 'right' }, border: allBorder() } },
        txt(`${loan.years} ans`, false, C.textDark, C.white, 'center'),
        ...YEARS.map((_, yi) => num(loan.annualPayments[yi]?.balance ?? 0)),
      ], r++)
    })
    const loanLastRow = r  // exclusive — ligne après le dernier emprunt

    // Total dettes — SUM des soldes individuels (col E=4 pour An1 … I=8 pour An5)
    const rLoanTotal = r
    setRow(ws, [
      lbl('= Total dettes financières', true), empty(C.lightGreen), empty(C.lightGreen), empty(C.lightGreen),
      ...Array.from({ length: 5 }, (_, yi) =>
        numF(
          `SUM(${colLetter(4+yi)}${loanFirstRow+1}:${colLetter(4+yi)}${loanLastRow})`,
          dettes[yi], true, false, C.lightGreen,
        ),
      ),
    ], r++)
    // Mise à jour rétroactive de la ligne "Dettes financières" dans le PASSIF
    Array.from({ length: 5 }, (_, yi) => {
      ws[XLSXStyle.utils.encode_cell({ r: rDettes, c: 1+yi })] = numF(
        `${colLetter(4+yi)}${rLoanTotal+1}`, dettes[yi],
      )
    })

    // Remboursements capital cumulés
    const rembCumul = YEARS.map((_, yi) =>
      LOAN.totalCapitalByYear.slice(0, yi + 1).reduce((a, b) => a + b, 0),
    )
    setRow(ws, [
      lbl('Remboursements capital cumulés', false, true, C.lightGray),
      empty(C.lightGray), empty(C.lightGray), empty(C.lightGray),
      ...rembCumul.map(v => num(v, false, false, C.lightGray)),
    ], r++)

    // Intérêts payés cumulés
    const intCumul = YEARS.map((_, yi) =>
      LOAN.totalInterestByYear.slice(0, yi + 1).reduce((a, b) => a + b, 0),
    )
    setRow(ws, [
      lbl('Intérêts payés cumulés', false, true, C.lightGray),
      empty(C.lightGray), empty(C.lightGray), empty(C.lightGray),
      ...intCumul.map(v => num(v, false, false, C.lightGray)),
    ], r++)

    // Update range for wider sheet
    ws['!cols'] = [220, 120, 70, 65, 110, 110, 110, 110, 110].map(w => ({ wpx: w }))
    setRange(ws, r, DCOLS)
  } else {
    ws['!cols'] = [250, 120, 120, 120, 120, 120].map(w => ({ wpx: w }))
    setRange(ws, r, COLS)
  }
  return ws
}

// ─── Feuille 7 : Plan de financement ─────────────────────────────────────────
// Layout identique à FinancingSection.tsx : financement initial + évolution trésorerie
function buildFinancingSheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  incomeRefs: IncomeSheetRefs,
  investments: Investment[],
  additionalFundings: AdditionalFunding[],
  settings: CompanySettings,
  dataRefs?: DataSheetRefs,
): Record<string,unknown> {
  const IS = result.incomeStatement
  const LR = result.loanRepaymentTable
  const ws: Record<string,unknown> = {}
  const COLS = 7  // libellé + An0 + An1..5
  let r = 0
  r = titleBlock(ws, companyName, 'PLAN DE FINANCEMENT (en Ar)', COLS, r)

  // ── Calculs identiques à FinancingSection ──────────────────────────────────
  const invEquity = investments.reduce((s, i) => s + i.financedEquity, 0)
  const invLoan   = investments.reduce((s, i) => s + i.financedLoan, 0)
  const invGrant  = investments.reduce((s, i) => s + i.financedGrant, 0)
  const invTotal  = investments.reduce((s, i) => s + i.amount, 0)
  const fdr       = settings.fondsRoulement ?? 0
  const tresoInitiale = invEquity + invLoan + invGrant - invTotal + fdr

  const afs = [1, 2, 3, 4, 5].map((yr) => {
    const af = additionalFundings.find((f) => f.yearNumber === yr)
    return af ?? { yearNumber: yr, equity: 0, loan: 0, loanRate: 0, loanYears: 5, grant: 0 }
  })
  const addEquity  = afs.map((af) => af.equity)
  const addLoan    = afs.map((af) => af.loan)
  const addGrant   = afs.map((af) => af.grant)
  const addTotal   = afs.map((af) => af.equity + af.loan + af.grant)

  const caf        = IS.netIncomeByYear.map((n, y) => n + IS.depreciationByYear[y])
  const rembCap    = LR.totalCapitalByYear
  const opCF       = caf.map((c, y) => c - rembCap[y])

  const cashCum: number[] = []
  let running = tresoInitiale
  for (let y = 0; y < 5; y++) {
    running += opCF[y] + addTotal[y]
    cashCum.push(Math.round(running))
  }

  const tresoBefore = [0, 1, 2, 3, 4].map((y) => {
    const prev = y === 0 ? tresoInitiale : cashCum[y - 1]
    return Math.round(prev + opCF[y])
  })

  // ── En-tête : libellé | An 0 | An 1 .. An 5 ──────────────────────────────
  setRow(ws, [hdr('Libellé'), hdr('An 0'), ...YEARS.map(y => hdr(y))], r++)

  // ── Section 1 : Financement initial ───────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('💰  FINANCEMENT INITIAL')
  merge(ws, r, 0, r, COLS-1); r++

  const hasInvR2  = (dataRefs?.invCount ?? 0) > 0
  const invTotRow2 = dataRefs?.invTotalExcelRow ?? 0
  // Colonnes Données de base : B=Montant, C=FP, E=Emprunt, G=Sub
  const fpRows1: [string, number, string][] = [
    ['Fonds propres (investissements)', invEquity,  `'Données de base'!C${invTotRow2}`],
    ['Emprunts initiaux',               invLoan,    `'Données de base'!E${invTotRow2}`],
    ['Subventions initiales',           invGrant,   `'Données de base'!G${invTotRow2}`],
  ]
  fpRows1.forEach(([l, v, f]) => setRow(ws, [lbl(l, false, true),
    hasInvR2 ? numF(f, v) : num(v, false),
    ...Array(5).fill(empty())], r++))
  setRow(ws, [lbl('Total investissements', true, false, C.lightGray),
    hasInvR2 ? numF(`'Données de base'!B${invTotRow2}`, invTotal, true, false, C.lightGray) : num(invTotal, true, false, C.lightGray),
    ...Array(5).fill(empty(C.lightGray))], r++)
  setRow(ws, [lbl('+ Fonds de roulement initial', false, true), num(fdr, false), ...Array(5).fill(empty())], r++)
  setRow(ws, [lbl('→ Trésorerie initiale (An 0)', true, false, C.lightGreen), num(tresoInitiale, true, false, C.lightGreen), ...Array(5).fill(empty(C.lightGreen))], r++)
  r++

  // ── Section 2 : Apports complémentaires (An 1-5) ─────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📈  APPORTS COMPLÉMENTAIRES (An 1-5)')
  merge(ws, r, 0, r, COLS-1); r++

  const fpRows2: [string, number[]][] = [
    ['Fonds propres additionnels', addEquity],
    ['Emprunts additionnels', addLoan],
    ['Subventions additionnelles', addGrant],
    ['Total apports', addTotal],
  ]
  fpRows2.forEach(([l, d], idx) => {
    const bold = idx === 3
    const bg   = bold ? C.lightGreen : undefined
    setRow(ws, [lbl(l, bold, !bold, bg), empty(), ...d.map(v => num(v, bold, false, bg))], r++)
  })
  r++

  // ── Section 3 : Évolution de trésorerie (An 1-5) ─────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('💧  ÉVOLUTION DE TRÉSORERIE (An 1-5)')
  merge(ws, r, 0, r, COLS-1); r++

  // CAF = NI + Dep (lien compte de résultat)
  setRow(ws, [
    lbl('CAF (Résultat net + Amortissements)', false, true),
    empty(),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${xRef('Compte de résultat', incomeRefs.rNI, yi)}+${xRef('Compte de résultat', incomeRefs.rDep, yi)}`, caf[yi]),
    ),
  ], r++)

  setRow(ws, [lbl('(−) Remboursement capital emprunt', false, true), empty(), ...rembCap.map(v => num(v))], r++)

  const rOpCF = r
  setRow(ws, [
    lbl('= Flux opérationnel net', true, false, C.lightGray),
    empty(C.lightGray),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`${cellAddr(rOpCF-2, 2+yi)}-${cellAddr(rOpCF-1, 2+yi)}`, opCF[yi], true, false, C.lightGray),
    ),
  ], r++)

  setRow(ws, [lbl('(+) Apports complémentaires', false, true), empty(), ...addTotal.map(v => num(v))], r++)

  const rTresoBefore = r
  setRow(ws, [
    lbl('Trésorerie avant apport', false, true),
    num(tresoInitiale),
    ...tresoBefore.map(v => num(v, false, v < 0)),
  ], r++)

  const rTresoCum = r
  setRow(ws, [
    lbl("Trésorerie cumulée fin d'année", true, false, C.lightGreen),
    num(tresoInitiale, true, false, C.lightGreen),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `${cellAddr(rTresoBefore, 2+yi)}+${cellAddr(rOpCF+1, 2+yi)}`,
        cashCum[yi],
        true, cashCum[yi] < 0, C.lightGreen,
      ),
    ),
  ], r++)

  // Silence lint
  void rTresoCum

  ws['!cols'] = [240, 110, 110, 110, 110, 110, 110].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  return ws
}

// ─── Feuille 8 : Rentabilité ──────────────────────────────────────────────────
function buildProfitabilitySheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  discountRate: number,
  incomeRefs: IncomeSheetRefs,
  cfRefs: CashFlowSheetRefs,
  dataRefs: DataSheetRefs,
  investments: Investment[],
): { ws: Record<string,unknown>; profRefs: ProfitabilitySheetRefs } {
  const KPI = result.profitability
  const IS  = result.incomeStatement
  const R   = result.profitabilityRatios
  const CF  = result.cashFlowStatement
  const ws: Record<string,unknown> = {}
  const COLS = 7  // label + An0 + An1-5 (nécessaire pour la ligne de flux IRR)
  let r = 0
  r = titleBlock(ws, companyName, 'INDICATEURS DE RENTABILITÉ', COLS, r)

  // ── Section de calcul : flux source pour VAN et TRI ──────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('⚙️  DONNÉES DE CALCUL (source des formules VAN / TRI)')
  merge(ws, r, 0, r, COLS-1); r++
  setRow(ws, [hdr(''), hdr('An 0'), ...YEARS.map(y => hdr(y))], r++)

  // Ligne unique : [An0 = −FP, An1−5 = CAF − Remboursement capital]
  // → utilisée directement par IRR() et NPV() dans les KPIs ci-dessous
  const initialEquity = investments.reduce((s, i) => s + i.financedEquity, 0)
  const opFlows = CF.operatingCashFlowByYear.map((caf, y) => caf - CF.loanRepaymentByYear[y])
  const hasFPRef = dataRefs.invCount > 0
  const rFluxAll = r
  setRow(ws, [
    lbl(' Flux de trésorerie net (CAF - Remb.))', true, false, C.lightBlue),
    hasFPRef
      ? numF(`-'Données de base'!C${dataRefs.invTotalExcelRow}`, -initialEquity, true, false, C.lightBlue)
      : num(-initialEquity, true, false, C.lightBlue),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(
        `'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rCAF+1}-'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rRemb+1}`,
        opFlows[yi], false, false, C.lightBlue,
      )
    ),
  ], r++)
  r++

  // Adresses utiles dérivées de la ligne de flux
  const fpCell    = cellAddr(rFluxAll, 1)                                  // col B = An0 = −FP
  const fluxRange = `${cellAddr(rFluxAll, 2)}:${cellAddr(rFluxAll, 6)}`   // col C-G = An1-5
  const allRange  = `${cellAddr(rFluxAll, 1)}:${cellAddr(rFluxAll, 6)}`   // col B-G = An0 + An1-5
  const r_dec     = discountRate / 100

  // ── KPIs globaux ─────────────────────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🎯  INDICATEURS GLOBAUX')
  merge(ws, r, 0, r, COLS-1); r++
  setRow(ws, [hdr('Indicateur'), hdr('Valeur'), hdr('Unité'), hdr('Commentaire'), ...Array(COLS-4).fill(empty(C.darkBg))], r++)

  const rVAN = r  // ← exporté dans ProfitabilitySheetRefs
  setRow(ws, [
    lbl('VAN (Valeur Actuelle Nette)', true),
    numF(`NPV(${r_dec},${fluxRange})+${fpCell}`, KPI.npv, true, KPI.npv < 0, KPI.npv >= 0 ? C.lightGreen : C.dangerLt),
    txt('Ar', false, C.textMuted),
    txt(KPI.npv >= 0 ? '✅ VAN > 0 : projet crée de la valeur' : '❌ VAN < 0 : projet non rentable', false, KPI.npv >= 0 ? C.success : C.danger),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // TRI = IRR(An0:An5, 0.1) — IRR standard Excel sur la plage B-G de la ligne de flux
  const rTRI = r  // ← exporté dans ProfitabilitySheetRefs
  setRow(ws, [
    lbl('TRI (Taux de Rentabilité Interne)', true),
    KPI.irr !== null
      ? { f: `IFERROR(IRR(${allRange},0.1),"N/A")`, v: KPI.irr / 100, t: 'n', z: '0.0%',
          s: { font: { bold: true, sz: 11, color: { rgb: KPI.irr > discountRate ? C.success : C.danger } },
               fill: { fgColor: { rgb: KPI.irr > discountRate ? C.lightGreen : C.dangerLt } },
               alignment: { horizontal: 'center' }, border: allBorder() } }
      : txt('N/A', true, C.danger, C.dangerLt),
    txt('%', false, C.textMuted),
    txt(KPI.irr !== null
      ? (KPI.irr > discountRate ? `✅ TRI > taux actualisation (${discountRate} %)` : `⚠️  TRI ≤ taux actualisation (${discountRate} %)`)
      : 'Flux insuffisants pour calculer le TRI',
      false, KPI.irr !== null && KPI.irr > discountRate ? C.success : C.textMuted),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // IP = (VAN + FP) / FP  (fpCell est négatif : -fpCell = FP ; VAN_cell - fpCell = VAN + FP)
  const rIP = r  // ← exporté dans ProfitabilitySheetRefs
  setRow(ws, [
    lbl('Indice de profitabilité (IP)', true),
    numF(`IF(${fpCell}<>0,(${cellAddr(rVAN,1)}-${fpCell})/(-${fpCell}),0)`,
      KPI.profitabilityIndex, true, KPI.profitabilityIndex < 1,
      KPI.profitabilityIndex >= 1 ? C.lightGreen : C.dangerLt, '0.00'),
    txt('', false, C.textMuted),
    txt(KPI.profitabilityIndex >= 1 ? '✅ IP ≥ 1 : chaque Ar investi génère un gain' : '❌ IP < 1 : rendement insuffisant',
      false, KPI.profitabilityIndex >= 1 ? C.success : C.danger),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // IF imbriqués (pas d'entrée matricielle nécessaire)
  const cumCols = Array.from({ length: 5 }, (_, yi) =>
    `'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rCumul+1}`)
  const delaiF = `IF(${cumCols[0]}>=0,1,IF(${cumCols[1]}>=0,2,IF(${cumCols[2]}>=0,3,IF(${cumCols[3]}>=0,4,IF(${cumCols[4]}>=0,5,6)))))`
  const delaiOk = KPI.paybackYear !== null && KPI.paybackYear <= 3
  const rDelai = r  // ← exporté dans ProfitabilitySheetRefs
  setRow(ws, [
    lbl('Délai de récupération', true),
    { f: delaiF, v: KPI.paybackYear ?? 6, t: 'n', z: '"An "0',
      s: { font: { bold: true, sz: 11, color: { rgb: delaiOk ? C.success : C.danger } },
           fill: { fgColor: { rgb: delaiOk ? C.lightGreen : C.dangerLt } },
           alignment: { horizontal: 'center' }, border: allBorder() } },
    txt('an(s)', false, C.textMuted),
    txt(KPI.paybackYear !== null
      ? (delaiOk ? '✅ Récupération rapide (≤ 3 ans)' : '⚠️  Récupération lente (> 3 ans)')
      : '❌ Non récupéré sur 5 ans',
      false, delaiOk ? C.success : C.textMuted),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // 1ère année profitable — premier An où résultat net > 0
  const niCols = Array.from({ length: 5 }, (_, yi) =>
    `'Compte de résultat'!${colLetter(1+yi)}${incomeRefs.rNI+1}`)
  const profitF = `IF(${niCols[0]}>0,1,IF(${niCols[1]}>0,2,IF(${niCols[2]}>0,3,IF(${niCols[3]}>0,4,IF(${niCols[4]}>0,5,6)))))`
  const profitOk = KPI.breakEvenYear !== null
  const rProfit = r  // ← exporté dans ProfitabilitySheetRefs
  setRow(ws, [
    lbl('1ère année profitable', true),
    { f: profitF, v: KPI.breakEvenYear ?? 6, t: 'n', z: '"An "0',
      s: { font: { bold: true, sz: 11, color: { rgb: profitOk ? C.success : C.danger } },
           fill: { fgColor: { rgb: profitOk ? C.lightGreen : C.dangerLt } },
           alignment: { horizontal: 'center' }, border: allBorder() } },
    txt('an(s)', false, C.textMuted),
    txt(profitOk ? '✅ Bénéfice atteint dans la période' : '❌ Pas de bénéfice sur 5 ans',
      false, profitOk ? C.success : C.danger),
    ...Array(COLS-4).fill(empty()),
  ], r++)
  r++

  // ── Rentabilité économique (I₀ = total investissement amorti) ────────────
  const EKPI = result.economicProfitability
  const totalInvAmount = investments.reduce((s, i) => s + i.amount, 0)
  const hasTotalInvRef = dataRefs.invCount > 0
  const econFlows = CF.operatingCashFlowByYear   // CAF brute avant remboursement

  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('🏭  RENTABILITÉ ÉCONOMIQUE (I₀ = Total Investissement Amorti)', C.blue)
  merge(ws, r, 0, r, COLS-1); r++
  setRow(ws, [
    txt('Point de vue projet : flux = CAF brute (avant remboursement), I₀ = fonds propres + subvention + emprunt', false, C.textMuted, C.lightBlue),
    ...Array(COLS-1).fill(empty(C.lightBlue)),
  ], r++)

  // Ligne flux économiques : An0 = −Total, An1-5 = CAF brute
  setRow(ws, [hdr(''), hdr('An 0'), ...YEARS.map(y => hdr(y))], r++)
  const rFluxEco = r
  setRow(ws, [
    lbl('Flux économiques (CAF brute)', true, false, C.lightBlue),
    hasTotalInvRef
      ? numF(`-'Données de base'!B${dataRefs.invTotalExcelRow}`, -totalInvAmount, true, false, C.lightBlue)
      : num(-totalInvAmount, true, false, C.lightBlue),
    ...Array.from({ length: 5 }, (_, yi) =>
      numF(`'Trésorerie 5 ans'!${colLetter(1+yi)}${cfRefs.rCAF+1}`, econFlows[yi], false, false, C.lightBlue)
    ),
  ], r++)
  r++

  const fpCellEco    = cellAddr(rFluxEco, 1)
  const fluxRangeEco = `${cellAddr(rFluxEco, 2)}:${cellAddr(rFluxEco, 6)}`
  const allRangeEco  = `${cellAddr(rFluxEco, 1)}:${cellAddr(rFluxEco, 6)}`

  setRow(ws, [hdr('Indicateur'), hdr('Valeur'), hdr('Unité'), hdr('Commentaire'), ...Array(COLS-4).fill(empty(C.darkBg))], r++)

  // VAN économique
  const rVANeco = r
  setRow(ws, [
    lbl('VAN économique', true),
    numF(`NPV(${r_dec},${fluxRangeEco})+${fpCellEco}`, EKPI.npv, true, EKPI.npv < 0, EKPI.npv >= 0 ? C.lightGreen : C.dangerLt),
    txt('Ar', false, C.textMuted),
    txt(EKPI.npv >= 0 ? '✅ Projet économiquement rentable' : '❌ Projet économiquement non rentable', false, EKPI.npv >= 0 ? C.success : C.danger),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // TRI économique
  setRow(ws, [
    lbl('TRI économique', true),
    EKPI.irr !== null
      ? { f: `IFERROR(IRR(${allRangeEco},0.1),"N/A")`, v: EKPI.irr / 100, t: 'n', z: '0.0%',
          s: { font: { bold: true, sz: 11, color: { rgb: EKPI.irr > discountRate ? C.success : C.danger } },
               fill: { fgColor: { rgb: EKPI.irr > discountRate ? C.lightGreen : C.dangerLt } },
               alignment: { horizontal: 'center' }, border: allBorder() } }
      : txt('N/A', true, C.danger, C.dangerLt),
    txt('%', false, C.textMuted),
    txt(EKPI.irr !== null
      ? (EKPI.irr > discountRate ? `✅ TRI éco > taux actualisation (${discountRate} %)` : `⚠️  TRI éco ≤ taux actualisation (${discountRate} %)`)
      : 'Flux insuffisants pour calculer le TRI éco',
      false, EKPI.irr !== null && EKPI.irr > discountRate ? C.success : C.textMuted),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // Indice de profitabilité économique = (VAN + I₀) / I₀
  setRow(ws, [
    lbl('Indice de profitabilité économique', true),
    numF(`IF(${fpCellEco}<>0,(${cellAddr(rVANeco,1)}-${fpCellEco})/(-${fpCellEco}),0)`,
      EKPI.profitabilityIndex, true, EKPI.profitabilityIndex < 1,
      EKPI.profitabilityIndex >= 1 ? C.lightGreen : C.dangerLt, '0.00'),
    txt('', false, C.textMuted),
    txt(EKPI.profitabilityIndex >= 1 ? '✅ IP ≥ 1 : chaque Ar investi génère un gain' : '❌ IP < 1 : rendement insuffisant',
      false, EKPI.profitabilityIndex >= 1 ? C.success : C.danger),
    ...Array(COLS-4).fill(empty()),
  ], r++)

  // Délai de récupération économique — trésorerie cumulée = An0 + An1 + … + Anm ≥ 0
  {
    const cumEco = (n: number) => [fpCellEco, ...Array.from({length: n}, (_, yi) => cellAddr(rFluxEco, 2+yi))].join('+')
    const delaiEcoF = `IF((${cumEco(1)})>=0,1,IF((${cumEco(2)})>=0,2,IF((${cumEco(3)})>=0,3,IF((${cumEco(4)})>=0,4,IF((${cumEco(5)})>=0,5,6)))))`
    const delaiEcoOk = EKPI.paybackYear !== null && EKPI.paybackYear <= 3
    setRow(ws, [
      lbl('Délai de récupération économique', true),
      { f: delaiEcoF, v: EKPI.paybackYear ?? 6, t: 'n', z: '"An "0',
        s: { font: { bold: true, sz: 11, color: { rgb: delaiEcoOk ? C.success : C.danger } },
             fill: { fgColor: { rgb: delaiEcoOk ? C.lightGreen : C.dangerLt } },
             alignment: { horizontal: 'center' }, border: allBorder() } },
      txt('an(s)', false, C.textMuted),
      txt(EKPI.paybackYear !== null
        ? (delaiEcoOk ? '✅ Récupération rapide (≤ 3 ans)' : '⚠️  Récupération lente (> 3 ans)')
        : '❌ Non récupéré sur 5 ans',
        false, delaiEcoOk ? C.success : C.textMuted),
      ...Array(COLS-4).fill(empty()),
    ], r++)
  }
  r++

  // ── Tableau de résultats sur 5 ans ────────────────────────────────────────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📊  RÉSULTATS ANNUELS (en Ar)')
  merge(ws, r, 0, r, COLS-1); r++
  setRow(ws, [hdr('Indicateur'), ...YEARS.map(y => hdr(y)), empty(C.darkBg)], r++)

  const addRow = (label_: string, bold: boolean, colored: boolean, isPct: boolean,
    vals: number[], formula?: (yi: number) => string) => {
    const indent = label_.startsWith('  ')
    const bg = bold ? C.lightGreen : undefined
    setRow(ws, [
      lbl(label_.trim(), bold, indent, bg),
      ...Array.from({ length: 5 }, (_, yi) => {
        if (formula) return isPct ? numPctF(formula(yi), vals[yi], bold, colored) : numF(formula(yi), vals[yi], bold, colored, bg)
        return isPct ? numPct(vals[yi], bold, colored) : num(vals[yi], bold, colored, bg)
      }),
      empty(bg),
    ], r++)
  }
  addRow("Chiffre d'affaires", true,  false, false, IS.revenueByYear,
    (yi) => xRef('Compte de résultat', incomeRefs.rCA, yi))
  addRow('EBITDA', true, false, false, IS.ebitdaByYear,
    (yi) => xRef('Compte de résultat', incomeRefs.rEBIT, yi))
  addRow('  EBITDA margin %', false, false, true, R.ebitdaMarginPctByYear,
    (yi) => `IF(${xRef('Compte de résultat', incomeRefs.rCA, yi)}<>0,${xRef('Compte de résultat', incomeRefs.rEBIT, yi)}/${xRef('Compte de résultat', incomeRefs.rCA, yi)},0)`)
  addRow('  (−) Frais financiers', false, false, false, IS.interestByYear,
    (yi) => xRef('Compte de résultat', incomeRefs.rInt, yi))
  addRow('Résultat net', true, true, false, IS.netIncomeByYear,
    (yi) => xRef('Compte de résultat', incomeRefs.rNI, yi))
  addRow('  Marge nette %', false, true, true, R.netMarginPctByYear,
    (yi) => `IF(${xRef('Compte de résultat', incomeRefs.rCA, yi)}<>0,${xRef('Compte de résultat', incomeRefs.rNI, yi)}/${xRef('Compte de résultat', incomeRefs.rCA, yi)},0)`)
  addRow('  Marge brute %', false, false, true, R.grossMarginPctByYear,
    (yi) => `IF(${xRef('Compte de résultat', incomeRefs.rCA, yi)}<>0,${xRef('Compte de résultat', incomeRefs.rMB, yi)}/${xRef('Compte de résultat', incomeRefs.rCA, yi)},0)`)
  addRow('Trésorerie cumulée', true, true, false, CF.cumulativeCashByYear,
    (yi) => xRef('Trésorerie 5 ans', cfRefs.rCumul, yi))
  r++

  // ── Seuil de rentabilité annuel — formules depuis Compte de résultat ─────
  ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = sectionRow('📉  SEUIL DE RENTABILITÉ ANNUEL (en Ar)')
  merge(ws, r, 0, r, COLS-1); r++
  setRow(ws, [hdr('Indicateur'), ...YEARS.map(y => hdr(y)), empty(C.darkBg)], r++)

  // Seuil (Ar) = Charges fixes / (Marge brute / CA)
  // Charges fixes = Personnel + Amortissements + Charges d'exploitation
  const rSeuil = r
  setRow(ws, [
    lbl('Seuil de rentabilité (Ar)', true),
    ...Array.from({ length: 5 }, (_, yi) => {
      const col = colLetter(1+yi)
      const ca  = `'Compte de résultat'!${col}${incomeRefs.rCA+1}`
      const mb  = `'Compte de résultat'!${col}${incomeRefs.rMB+1}`
      const sta = `'Compte de résultat'!${col}${incomeRefs.rSta+1}`
      const dep = `'Compte de résultat'!${col}${incomeRefs.rDep+1}`
      const exp = `'Compte de résultat'!${col}${incomeRefs.rExp+1}`
      const int = `'Compte de résultat'!${col}${incomeRefs.rInt+1}`
      return numF(`IF(${ca}<>0,(${sta}+${dep}+${exp}+${int})/(${mb}/${ca}),0)`,
        R.breakEvenValueByYear[yi], false, false, C.lightGray)
    }),
    empty(C.lightGray),
  ], r++)

  // Point mort (mois) = Seuil / CA * 12
  setRow(ws, [
    lbl('Point mort (mois)', true),
    ...Array.from({ length: 5 }, (_, yi) => {
      const col  = colLetter(1+yi)
      const ca   = `'Compte de résultat'!${col}${incomeRefs.rCA+1}`
      const seuil = cellAddr(rSeuil, 1+yi)
      return numF(`IF(${ca}<>0,${seuil}/${ca}*12,0)`, R.breakEvenMonthByYear[yi], false, false)
    }),
    empty(),
  ], r++)

  ws['!cols'] = [270, 110, 55, 220, 70, 70, 70].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  const profRefs: ProfitabilitySheetRefs = { rVAN, rTRI, rIP, rDelai, rProfit, rSeuil }
  return { ws, profRefs }
}

// ─── Feuille 9 : Amortissements ───────────────────────────────────────────────
// Layout : 0=Désig 1=Montant 2=Durée 3=Annuité 4=VNC An1 5=VNC An2 ... 8=VNC An5 9=Total
function buildDepreciationSheet(
  result: ReturnType<typeof computeAll>,
  companyName: string,
  investments: Investment[],
  dataRefs: DataSheetRefs,
): Record<string,unknown> {
  const DEP = result.depreciationTable
  const ws: Record<string,unknown> = {}
  const COLS = 10
  let r = 0
  r = titleBlock(ws, companyName, "TABLEAU D'AMORTISSEMENT LINÉAIRE (en Ar)", COLS, r)

  setRow(ws, [
    hdr('Désignation'), hdr('Montant brut'), hdr('Durée'), hdr('Annuité'),
    ...YEARS.map(y => hdr(`VNC ${y}`)),
    hdr('Total amorti'),
  ], r++)

  const hasRefs = dataRefs.invCount > 0

  DEP.byInvestment.forEach((row, idx) => {
    const inv = investments.find(i => i.id === row.investmentId)
    const usefulLife = inv?.usefulLife ?? 5
    const totalAmorti = row.annualDepreciation * Math.min(usefulLife, 5)
    const dbRow = hasRefs ? dataRefs.invFirstDataRow + idx : 0

    setRow(ws, [
      lbl(inv?.name ?? `#${row.investmentId}`, true),
      hasRefs ? numF(`'Données de base'!B${dbRow}`, inv?.amount ?? 0) : num(inv?.amount ?? 0),
      hasRefs ? numF(`'Données de base'!I${dbRow}`, usefulLife) : num(usefulLife),
      hasRefs ? numF(`'Données de base'!K${dbRow}`, row.annualDepreciation, false, false, C.lightBlue) : num(row.annualDepreciation, false, false, C.lightBlue),
      ...row.yearlyBook.map((v, y) =>
        hasRefs
          ? numF(`'Données de base'!${colLetter(11+y)}${dbRow}`, v)
          : num(v)
      ),
      hasRefs
        ? numF(`'Données de base'!K${dbRow}*MIN('Données de base'!I${dbRow},5)`, totalAmorti, false, false, C.lightGreen)
        : num(totalAmorti, false, false, C.lightGreen),
    ], r++)
  })

  r++
  // ── Ligne TOTAL ────────────────────────────────────────────────────────────
  const s = dataRefs.invFirstDataRow
  const e = hasRefs ? dataRefs.invFirstDataRow + dataRefs.invCount - 1 : 0
  const totalRow: object[] = Array(COLS).fill(null).map(() => empty(C.lightGreen))
  totalRow[0] = lbl('TOTAL', true, false, C.lightGreen)
  totalRow[1] = hasRefs ? numF(`SUM('Données de base'!B${s}:B${e})`, investments.reduce((sum,i)=>sum+i.amount,0), true, false, C.lightGreen) : num(investments.reduce((sum,i)=>sum+i.amount,0), true, false, C.lightGreen)
  totalRow[3] = hasRefs ? numF(`SUM('Données de base'!K${s}:K${e})`, DEP.totalAnnualDepreciation, true, false, C.lightGreen) : num(DEP.totalAnnualDepreciation, true, false, C.lightGreen)
  YEARS.forEach((_, y) => {
    const totalVNC = DEP.byInvestment.reduce((sum, row) => sum + (row.yearlyBook[y] ?? 0), 0)
    totalRow[4 + y] = hasRefs
      ? numF(`SUM('Données de base'!${colLetter(11+y)}${s}:'Données de base'!${colLetter(11+y)}${e})`, totalVNC, true, false, C.lightGreen)
      : num(totalVNC, true, false, C.lightGreen)
  })
  const grandTotalAmorti = DEP.byInvestment.reduce((sum, row, i) => {
    const inv = investments[i]
    return sum + row.annualDepreciation * Math.min(inv?.usefulLife ?? 5, 5)
  }, 0)
  totalRow[9] = num(grandTotalAmorti, true, false, C.lightGreen)
  setRow(ws, totalRow, r++)

  ws['!cols'] = [{ wpx: 200 }, { wpx: 100 }, { wpx: 60 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }]
  setRange(ws, r, COLS)
  return ws
}


// ─── Feuille 10 : Emprunts ────────────────────────────────────────────────────
function buildLoanSheet(result: ReturnType<typeof computeAll>, companyName: string): Record<string,unknown> {
  const LOAN = result.loanRepaymentTable
  const ws: Record<string,unknown> = {}
  const COLS = 1 + 5 * 3  // Emprunt + (Capital, Intérêts, Solde) × An 1-5
  let r = 0
  r = titleBlock(ws, companyName, 'TABLEAU DE REMBOURSEMENT DES EMPRUNTS (en Ar)', COLS, r)

  // En-tête : "An X" fusionné sur 3 colonnes (Capital / Intérêts / Solde)
  const rHdr1 = r
  setRow(ws, [hdr('Emprunt'), ...YEARS.flatMap(y => [hdr(y), empty(C.darkBg), empty(C.darkBg)])], r++)
  YEARS.forEach((_, yi) => merge(ws, rHdr1, 1 + yi * 3, rHdr1, 3 + yi * 3))
  setRow(ws, [empty(C.darkBg), ...YEARS.flatMap(() => [subHdr('Capital remboursé'), subHdr('Intérêts payés'), subHdr('Solde restant dû')])], r++)

  LOAN.byLoan.forEach(loan => {
    setRow(ws, [
      lbl(loan.label, true),
      ...YEARS.flatMap((_, yi) => [
        num(loan.annualPayments[yi]?.capital ?? 0),
        num(loan.annualPayments[yi]?.interest ?? 0, false, false, C.lightGray),
        num(loan.annualPayments[yi]?.balance ?? 0, false, false, C.lightBlue),
      ]),
    ], r++)
  })

  const totalBalanceByYear = YEARS.map((_, yi) =>
    LOAN.byLoan.reduce((sum, loan) => sum + (loan.annualPayments[yi]?.balance ?? 0), 0),
  )
  setRow(ws, [
    lbl('TOTAL', true),
    ...YEARS.flatMap((_, yi) => [
      num(LOAN.totalCapitalByYear[yi], true, false, C.lightGreen),
      num(LOAN.totalInterestByYear[yi], false, false, C.lightGray),
      num(totalBalanceByYear[yi], true, false, C.lightBlue),
    ]),
  ], r++)

  ws['!cols'] = [200, ...Array(15).fill(100)].map(w => ({ wpx: w }))
  setRange(ws, r, COLS)
  return ws
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ExportSection() {
  const company  = useCompanyStore((s) => s.company)!
  const settings = company.settings
  const [isExporting, setIsExporting] = useState(false)

  const result = useMemo(() => {
    if (!settings) return null
    return computeAll(settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, company.additionalFundings)
  }, [settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, company.additionalFundings])

  /** Supprime les formules d'un workbook (garde uniquement la valeur v) */
  function stripFormulas(wb: ReturnType<typeof XLSXStyle.utils.book_new>) {
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      for (const addr of Object.keys(ws)) {
        if (addr.startsWith('!')) continue
        const cell = ws[addr] as { v?: unknown; f?: string; t?: string; s?: unknown }
        if (cell && cell.f !== undefined) {
          delete cell.f
        }
      }
    }
    return wb
  }

  /** Injecte le logo AIDES sur toutes les feuilles via JSZip.
   *  Corrige aussi [Content_Types].xml pour eviter l'erreur a l'ouverture Excel. */
  async function injectLogo(xlsxBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(xlsxBuffer)
      const sheetFiles = Object.keys(zip.files).filter(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
      const logoRes = await fetch('/logo-aides.png')
      if (!logoRes.ok) return xlsxBuffer
      const logoBytes = await logoRes.arrayBuffer()
      zip.file('xl/media/logo.png', logoBytes)
      let ctXml = await zip.file('[Content_Types].xml')!.async('string')
      for (const sheetPath of sheetFiles) {
        const sheetNum = sheetPath.match(/sheet(\d+)\.xml$/)?.[1] ?? '1'
        const drawingXml = [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"',
          '  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
          '  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
          '  <xdr:oneCellAnchor>',
          '    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>',
          '    <xdr:ext cx="1200000" cy="480000"/>',
          '    <xdr:pic>',
          '      <xdr:nvPicPr>',
          '        <xdr:cNvPr id="2" name="Logo AIDES"/>',
          '        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>',
          '      </xdr:nvPicPr>',
          '      <xdr:blipFill>',
          '        <a:blip r:embed="rId1"/>',
          '        <a:stretch><a:fillRect/></a:stretch>',
          '      </xdr:blipFill>',
          '      <xdr:spPr>',
          '        <a:xfrm><a:off x="0" y="0"/><a:ext cx="1200000" cy="480000"/></a:xfrm>',
          '        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
          '      </xdr:spPr>',
          '    </xdr:pic>',
          '    <xdr:clientData/>',
          '  </xdr:oneCellAnchor>',
          '</xdr:wsDr>',
        ].join('\n')
        const drawingRelsXml = [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/>',
          '</Relationships>',
        ].join('\n')
        zip.file(`xl/drawings/drawing${sheetNum}.xml`, drawingXml)
        zip.file(`xl/drawings/_rels/drawing${sheetNum}.xml.rels`, drawingRelsXml)
        const drawingCT = `<Override PartName="/xl/drawings/drawing${sheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
        if (!ctXml.includes(`drawing${sheetNum}.xml`)) {
          ctXml = ctXml.replace('</Types>', `${drawingCT}\n</Types>`)
        }
        const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetNum}.xml.rels`
        const drawingRel = `<Relationship Id="rIdDrw" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetNum}.xml"/>`
        const existingRels = zip.file(sheetRelsPath)
        let sheetRelsXml = existingRels
          ? await existingRels.async('string')
          : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
        if (!sheetRelsXml.includes('rIdDrw')) {
          sheetRelsXml = sheetRelsXml.replace('</Relationships>', `${drawingRel}\n</Relationships>`)
        }
        zip.file(sheetRelsPath, sheetRelsXml)
        let sheetXml = await zip.file(sheetPath)!.async('string')
        if (!sheetXml.includes('<drawing')) {
          sheetXml = sheetXml.replace('</worksheet>', `<drawing r:id="rIdDrw"/></worksheet>`)
        }
        zip.file(sheetPath, sheetXml)
      }
      zip.file('[Content_Types].xml', ctXml)
      return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
    } catch (err) {
      console.warn('[Export] Logo injection failed, using plain xlsx:', err)
      return xlsxBuffer
    }
  }

  async function exportXLSXNoFormulas() {
    if (!result || !settings) return
    setIsExporting(true)
    try {
      const wb = XLSXStyle.utils.book_new()
      const cn = company.name

      // Construire d'abord les feuilles dont Synthèse dépend
      const { ws: dataWs, refs: dataRefs } = buildDataSheet(result, company.products, company.materials, company.staffMembers, company.expenses, company.investments, cn, company.investmentTerrains)
      const { ws: incomeWs, incomeRefs } = buildIncomeSheet(result, cn, dataRefs, settings ?? undefined)
      const { ws: cfWs, cfRefs } = buildCashFlowSheet(result, cn, incomeRefs, company.investments, company.additionalFundings, dataRefs)
      // Construire Rentabilité avant Synthèse pour obtenir profRefs (références de lignes)
      const { ws: profWs, profRefs } = buildProfitabilitySheet(result, cn, settings.discountRate, incomeRefs, cfRefs, dataRefs, company.investments)
      // Synthèse en premier onglet, mais construite après pour avoir toutes les refs
      XLSXStyle.utils.book_append_sheet(wb, buildSyntheseSheet(result, company as never, settings, company.products, company.staffMembers, company.investments, incomeRefs, cfRefs, dataRefs, company.investmentTerrains, profRefs), 'Synthèse')
      XLSXStyle.utils.book_append_sheet(wb, dataWs, 'Données de base')
      XLSXStyle.utils.book_append_sheet(wb, incomeWs, 'Compte de résultat')
      XLSXStyle.utils.book_append_sheet(wb, cfWs, 'Trésorerie 5 ans')
      XLSXStyle.utils.book_append_sheet(wb, buildMonthlySheet(result, company.products, company.materials, company.staffMembers, company.expenses, company.additionalFundings, settings, company.investments, cn, incomeRefs, cfRefs, dataRefs), 'Trésorerie mensuelle')
      XLSXStyle.utils.book_append_sheet(wb, buildBalanceSheet(result, cn, company.investments, incomeRefs, cfRefs, dataRefs, company.investmentTerrains, settings), 'Bilan')
      XLSXStyle.utils.book_append_sheet(wb, buildFinancingSheet(result, cn, incomeRefs, company.investments, company.additionalFundings, settings, dataRefs), 'Plan de financement')
      XLSXStyle.utils.book_append_sheet(wb, profWs, 'Rentabilité')
      XLSXStyle.utils.book_append_sheet(wb, buildDepreciationSheet(result, cn, company.investments, dataRefs), 'Amortissements')
      if (result.loanRepaymentTable.byLoan.length > 0) {
        XLSXStyle.utils.book_append_sheet(wb, buildLoanSheet(result, cn), 'Emprunts')
      }
      stripFormulas(wb)

      const date = new Date().toISOString().slice(0, 10)
      const filename = `BusinessPlan_${cn.replace(/\s+/g,'_')}_${date}_valeurs.xlsx`

      const xlsxBuffer: ArrayBuffer = XLSXStyle.write(wb, { type: 'array', bookType: 'xlsx' })
      const finalBuffer = await injectLogo(xlsxBuffer)

      const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  async function exportXLSX() {
    if (!result || !settings) return
    setIsExporting(true)
    try {
      const wb = XLSXStyle.utils.book_new()
      const cn = company.name

      // Construire d'abord les feuilles dont Synthèse dépend
      const { ws: dataWs, refs: dataRefs } = buildDataSheet(result, company.products, company.materials, company.staffMembers, company.expenses, company.investments, cn, company.investmentTerrains)
      const { ws: incomeWs, incomeRefs } = buildIncomeSheet(result, cn, dataRefs, settings ?? undefined)
      const { ws: cfWs, cfRefs } = buildCashFlowSheet(result, cn, incomeRefs, company.investments, company.additionalFundings, dataRefs)
      // Construire Rentabilité avant Synthèse pour obtenir profRefs (références de lignes)
      const { ws: profWs, profRefs } = buildProfitabilitySheet(result, cn, settings.discountRate, incomeRefs, cfRefs, dataRefs, company.investments)
      // Synthèse en premier onglet, mais construite après pour avoir toutes les refs
      XLSXStyle.utils.book_append_sheet(wb, buildSyntheseSheet(result, company as never, settings, company.products, company.staffMembers, company.investments, incomeRefs, cfRefs, dataRefs, company.investmentTerrains, profRefs), 'Synthèse')
      XLSXStyle.utils.book_append_sheet(wb, dataWs, 'Données de base')
      XLSXStyle.utils.book_append_sheet(wb, incomeWs, 'Compte de résultat')
      XLSXStyle.utils.book_append_sheet(wb, cfWs, 'Trésorerie 5 ans')
      XLSXStyle.utils.book_append_sheet(wb, buildMonthlySheet(result, company.products, company.materials, company.staffMembers, company.expenses, company.additionalFundings, settings, company.investments, cn, incomeRefs, cfRefs, dataRefs), 'Trésorerie mensuelle')
      XLSXStyle.utils.book_append_sheet(wb, buildBalanceSheet(result, cn, company.investments, incomeRefs, cfRefs, dataRefs, company.investmentTerrains, settings), 'Bilan')
      XLSXStyle.utils.book_append_sheet(wb, buildFinancingSheet(result, cn, incomeRefs, company.investments, company.additionalFundings, settings, dataRefs), 'Plan de financement')
      XLSXStyle.utils.book_append_sheet(wb, profWs, 'Rentabilité')
      XLSXStyle.utils.book_append_sheet(wb, buildDepreciationSheet(result, cn, company.investments, dataRefs), 'Amortissements')
      if (result.loanRepaymentTable.byLoan.length > 0) {
        XLSXStyle.utils.book_append_sheet(wb, buildLoanSheet(result, cn), 'Emprunts')
      }
      const date = new Date().toISOString().slice(0, 10)
      const filename = `BusinessPlan_${cn.replace(/\s+/g,'_')}_${date}.xlsx`

      const xlsxBuffer: ArrayBuffer = XLSXStyle.write(wb, { type: 'array', bookType: 'xlsx' })
      const finalBuffer = await injectLogo(xlsxBuffer)

            const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const hasData = !!(
    company.products.length > 0 ||
    company.materials.length > 0 ||
    company.staffMembers.length > 0 ||
    company.expenses.length > 0 ||
    company.investments.length > 0
  )

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h3 className="section-title" style={{ marginBottom: 4 }}>
          <i className="fas fa-file-excel" style={{ marginRight: 8, color: 'var(--color-primary)' }} />
          Export Excel
        </h3>
        <p className="section-subtitle">
          Générez un classeur Excel complet avec toutes les projections financières sur 5 ans.
        </p>
      </div>

      {/* Boutons export */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {/* Avec formules */}
          <button
            className="btn btn-primary"
            onClick={exportXLSX}
            disabled={isExporting || !hasData || !result}
            style={{ fontSize: 15, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
            title="Exporte avec des formules Excel (les cellules se recalculent si vous modifiez les données de base)"
          >
            {isExporting
              ? <><i className="fas fa-spinner fa-spin" /> Génération…</>
              : <><i className="fas fa-file-excel" /> Avec formules</>
            }
          </button>

          {/* Sans formules */}
          <button
            className="btn btn-secondary"
            onClick={exportXLSXNoFormulas}
            disabled={isExporting || !hasData || !result}
            style={{ fontSize: 15, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
            title="Exporte uniquement les valeurs calculées (sans formules, fichier plus léger et compatible avec tous les logiciels)"
          >
            {isExporting
              ? <><i className="fas fa-spinner fa-spin" /> Génération…</>
              : <><i className="fas fa-file-excel" /> Valeurs seules</>
            }
          </button>

          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {!hasData && <span style={{ color: 'var(--color-danger)' }}>⚠ Ajoutez des données avant d'exporter.</span>}
            {hasData && !result && <span style={{ color: 'var(--color-warning)' }}>⚠ Paramètres manquants dans la section Entreprise.</span>}
            {hasData && result && <span>&#x2713; {company.products.length} produit(s) &middot; {company.staffMembers.length} poste(s) &middot; {company.investments.length} investissement(s)</span>}
          </div>
        </div>

        {/* Contenu des feuilles */}
        <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
            Feuilles générées :
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
            {[
              { icon: 'fa-star', label: 'Synthèse' },
              { icon: 'fa-database', label: 'Données de base' },
              { icon: 'fa-table-list', label: 'Compte de résultat' },
              { icon: 'fa-water', label: 'Trésorerie 5 ans' },
              { icon: 'fa-calendar', label: 'Trésorerie mensuelle' },
              { icon: 'fa-scale-balanced', label: 'Bilan' },
              { icon: 'fa-chart-pie', label: 'Plan de financement' },
              { icon: 'fa-chart-line', label: 'Rentabilité' },
              { icon: 'fa-arrows-down-to-line', label: 'Amortissements' },
              { icon: 'fa-building-columns', label: 'Emprunts' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <i className={`fas ${icon}`} style={{ color: 'var(--color-primary)', width: 14 }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
