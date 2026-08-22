import { useMemo, useState } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import {
  computeAll,
  buildMonthlyCashFlow,
  formatAriary,
} from '@/calculations/calculations'
import { offlineFundingApi } from '@/api/offlineApi'
import type { AdditionalFunding } from '@/types'
import HelpButton from '@/components/ui/HelpButton'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function CashFlowSection() {
  const company = useCompanyStore((s) => s.company)!
  const updateAdditionalFundings = useCompanyStore((s) => s.updateAdditionalFundings)
  const settings = company.settings
  const [tab, setTab] = useState<'annuel' | 'mensuel'>('annuel')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local state pour les apports — éditable inline
  const [apports, setApports] = useState<AdditionalFunding[]>(() =>
    [1, 2, 3, 4, 5].map((yr) => {
      const found = company.additionalFundings.find((f) => f.yearNumber === yr)
      return found ?? { yearNumber: yr, equity: 0, loan: 0, loanRate: 0, loanYears: 5, grant: 0 }
    }),
  )

  const result = useMemo(() => {
    if (!settings) return null
    return computeAll(settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, apports)
  }, [settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, apports])

  if (!settings || !result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💧</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres dans la section Entreprise pour afficher la trésorerie.</p>
      </div>
    )
  }

  const { incomeStatement: IS, loanRepaymentTable: LR } = result

  // ─── Financement initial (An 0) ───────────────────────────────────────────
  const invEquity = company.investments.reduce((s, i) => s + i.financedEquity, 0)
  const invLoan   = company.investments.reduce((s, i) => s + i.financedLoan, 0)
  const invGrant  = company.investments.reduce((s, i) => s + i.financedGrant, 0)
  const invTotal  = company.investments.reduce((s, i) => s + i.amount, 0)
  const fdr = settings.fondsRoulement ?? 0
  const tresoInitiale = invEquity + invLoan + invGrant - invTotal + fdr

  // ─── Calculs annuels An 1-5 ───────────────────────────────────────────────
  const caf         = IS.netIncomeByYear.map((n, y) => n + IS.depreciationByYear[y])
  const rembCapital = LR.totalCapitalByYear
  const opCF        = caf.map((c, y) => c - rembCapital[y])

  const addTotal = apports.map((af) => af.equity + af.loan + af.grant)

  // Trésorerie cumulée (running sum depuis tresoInitiale)
  const cashCum: number[] = []
  let running = tresoInitiale
  for (let y = 0; y < 5; y++) {
    running += opCF[y] + addTotal[y]
    cashCum.push(Math.round(running))
  }

  // Tréso avant apport (pour alerte déficit)
  const tresoBefore = [0, 1, 2, 3, 4].map((y) => {
    const prev = y === 0 ? tresoInitiale : cashCum[y - 1]
    return prev + opCF[y]
  })

  // ─── Sauvegarder les apports ──────────────────────────────────────────────
  async function handleSaveApports() {
    setIsSaving(true)
    try {
      const updated = await offlineFundingApi.update(company.id, apports)
      updateAdditionalFundings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  function setApport(yr: number, field: keyof AdditionalFunding, val: number) {
    setApports((prev) =>
      prev.map((af) => af.yearNumber === yr ? { ...af, [field]: val } : af),
    )
    setSaved(false)
  }

  // ─── Trésorerie mensuelle An 1 ────────────────────────────────────────────
  const monthly = useMemo(() => buildMonthlyCashFlow(
    company.products, company.materials, company.staffMembers, company.expenses,
    IS, LR, apports, tresoInitiale,
  ), [company.products, company.materials, company.staffMembers, company.expenses, IS, LR, apports, tresoInitiale])

  // ─── Helper ───────────────────────────────────────────────────────────────
  const colored = (v: number) => ({ color: v < 0 ? 'var(--color-danger)' : v > 0 ? 'var(--color-success)' : undefined } as React.CSSProperties)
  const BOLD: React.CSSProperties = { fontWeight: 700, background: 'var(--color-surface-2)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>
              <i className="fas fa-water" style={{ marginRight: 8, color: '#3a7d2e' }} />
              Trésorerie prévisionnelle
            </h3>
            <p className="section-subtitle">Flux de trésorerie sur 5 ans + trésorerie mensuelle An 1</p>
          </div>
          <HelpButton
            title="Plan de trésorerie"
            content={"Flux de liquidités réels de l'entreprise.\n\n=> Trésorerie initiale (An 0) : Fonds propres + Emprunt + Subventions pour les investissements, moins le total des investissements, plus le Fonds de roulement.\n\n=> CAF (Capacité d'Autofinancement) : Résultat net + Amortissements. Cash généré par l'activité.\n\n=> Remboursement capital : Calculé par annuité constante sur la durée d'emprunt.\n\n=> Flux net An N : CAF − Remboursement capital + Apports complémentaires An N.\n\n=> Trésorerie cumulée : Trésorerie initiale + somme des flux nets précédents.\n\n=> Vue mensuelle : Encaissements et décaissements répartis selon les coefficients de saisonnalité de chaque produit et charge."}
          />
        </div>
        {saved && <span className="badge badge-success">✓ Apports enregistrés</span>}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--color-border)', paddingBottom: 4 }}>
        {(['annuel', 'mensuel'] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t)}>
            <i className={`fas ${t === 'annuel' ? 'fa-calendar' : 'fa-calendar-days'}`} style={{ marginRight: 6 }} />
            {t === 'annuel' ? 'Trésorerie 5 ans' : 'Mensuelle An 1'}
          </button>
        ))}
      </div>

      {/* ══════════════════ TABLE ANNUELLE ══════════════════ */}
      {tab === 'annuel' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Plan de trésorerie - An 0 à An 5</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>Rubrique</th>
                  <th style={{ textAlign: 'right', minWidth: 130, background: '#2d3748', color: '#fff' }}>An 0 (départ)</th>
                  {YEARS.map((y) => <th key={y} style={{ textAlign: 'right', minWidth: 130 }}>{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {/* Financement initial */}
                <tr><td colSpan={7} style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-xs)', padding: '4px 12px' }}>FINANCEMENT INITIAL (AN 0)</td></tr>
                {[
                  { label: 'Fonds propres amorti apportés',   val: invEquity, plus: true  },
                  { label: 'Emprunts reçus',            val: invLoan,   plus: true  },
                  { label: 'Subventions reçues',        val: invGrant,  plus: true  },
                  { label: '(-) Investissements réalisés', val: -invTotal, plus: false },
                  { label: 'Fonds de roulement initial', val: fdr,      plus: true  },
                ].map(({ label, val }) => (
                  <tr key={label}>
                    <td style={{ paddingLeft: 20 }}>{label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, ...colored(val) }}>{val !== 0 ? formatAriary(val) : '-'}</td>
                    {YEARS.map((_, i) => <td key={i} style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>-</td>)}
                  </tr>
                ))}
                <tr style={BOLD}>
                  <td>= Trésorerie initiale (An 0)</td>
                  <td style={{ textAlign: 'right', ...colored(tresoInitiale) }}>{formatAriary(tresoInitiale)}</td>
                  {YEARS.map((_, i) => <td key={i} style={{ textAlign: 'right' }}>-</td>)}
                </tr>

                {/* Flux opérationnels */}
                <tr><td colSpan={7} style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-xs)', padding: '4px 12px' }}>FLUX OPÉRATIONNELS (AN 1-5)</td></tr>
                {[
                  { label: 'CAF (Résultat net + Amortissements)', data: caf },
                  { label: '(-) Remboursement capital emprunt',   data: rembCapital.map((v) => -v) },
                ].map(({ label, data }) => (
                  <tr key={label}>
                    <td style={{ paddingLeft: 20 }}>{label}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>-</td>
                    {data.map((v, i) => (
                      <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                    ))}
                  </tr>
                ))}
                <tr style={BOLD}>
                  <td>= Flux de trésorerie net (CAF - Remb.)</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  {opCF.map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                  ))}
                </tr>

                {/* Apports complémentaires — éditables */}
                <tr><td colSpan={7} style={{ background: '#f5a623', color: '#fff', fontWeight: 700, fontSize: 'var(--text-xs)', padding: '4px 12px' }}>APPORTS COMPLÉMENTAIRES (saisie)</td></tr>
                {apports.map((af) => {
                  const y = af.yearNumber - 1
                  const before = tresoBefore[y]
                  const total = af.equity + af.loan + af.grant
                  return (
                    <tr key={af.yearNumber} style={{ verticalAlign: 'top' }}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Apports An {af.yearNumber}</div>
                        {before < 0 && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: 4 }}>
                            ⚠ Déficit avant apport : {formatAriary(before)}
                          </div>
                        )}
                        <div style={styles.apportGrid}>
                          <label style={styles.apportLabel}>Fonds propres</label>
                          <div style={styles.inputRow}>
                            <input type="number" className="form-input" style={styles.apportInput} min="0" step="10000"
                              value={af.equity} onChange={(e) => setApport(af.yearNumber, 'equity', +e.target.value)} />
                            <span style={styles.unit}>Ar</span>
                          </div>
                          <label style={styles.apportLabel}>Emprunt</label>
                          <div style={styles.inputRow}>
                            <input type="number" className="form-input" style={styles.apportInput} min="0" step="10000"
                              value={af.loan} onChange={(e) => setApport(af.yearNumber, 'loan', +e.target.value)} />
                            <span style={styles.unit}>Ar</span>
                          </div>
                          {af.loan > 0 && (<>
                            <label style={styles.apportLabel}>Taux emprunt</label>
                            <div style={styles.inputRow}>
                              <input type="number" className="form-input" style={{ ...styles.apportInput, width: 64 }} min="0" max="50" step="0.5"
                                value={af.loanRate} onChange={(e) => setApport(af.yearNumber, 'loanRate', +e.target.value)} />
                              <span style={styles.unit}>%</span>
                            </div>
                            <label style={styles.apportLabel}>Durée emprunt</label>
                            <div style={styles.inputRow}>
                              <input type="number" className="form-input" style={{ ...styles.apportInput, width: 64 }} min="1" max="20"
                                value={af.loanYears} onChange={(e) => setApport(af.yearNumber, 'loanYears', +e.target.value)} />
                              <span style={styles.unit}>ans</span>
                            </div>
                          </>)}
                          <label style={styles.apportLabel}>Subvention</label>
                          <div style={styles.inputRow}>
                            <input type="number" className="form-input" style={styles.apportInput} min="0" step="10000"
                              value={af.grant} onChange={(e) => setApport(af.yearNumber, 'grant', +e.target.value)} />
                            <span style={styles.unit}>Ar</span>
                          </div>
                        </div>
                        {total > 0 && (
                          <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                            Total : {formatAriary(total)}
                          </div>
                        )}
                      </td>
                      {/* Colonne An 0 vide */}
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>-</td>
                      {/* Colonnes An 1-5 : afficher total uniquement pour cette année */}
                      {YEARS.map((_, yi) => (
                        <td key={yi} style={{ textAlign: 'right', fontWeight: yi === y ? 600 : 400, color: yi === y && total > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                          {yi === y && total > 0 ? formatAriary(total) : '-'}
                        </td>
                      ))}
                    </tr>
                  )
                })}

                {/* Trésorerie cumulée */}
                <tr style={{ ...BOLD, borderTop: '2px solid var(--color-primary)' }}>
                  <td>Trésorerie cumulée fin d'année</td>
                  <td style={{ textAlign: 'right', ...colored(tresoInitiale) }}>{formatAriary(tresoInitiale)}</td>
                  {cashCum.map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bouton sauvegarder les apports */}
          <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveApports} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : '💾 Enregistrer les apports'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ TABLE MENSUELLE An 1 ══════════════════ */}
      {tab === 'mensuel' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Trésorerie mensuelle - An 1</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Rubrique</th>
                  {MONTHS.map((m) => <th key={m} style={{ textAlign: 'right', minWidth: 90 }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Encaissements (CA)', data: monthly.encaissements, bold: false },
                  { label: '(-) Coûts variables', data: monthly.coutsVariables.map((v) => -v), bold: false },
                  { label: '(-) Personnel', data: Array(12).fill(-monthly.personnelMensuel), bold: false },
                  { label: '(-) Autres charges', data: monthly.autresCharges.map((v) => -v), bold: false },
                  { label: '(-) Impôt mensuel', data: Array(12).fill(-monthly.impotMensuel), bold: false },
                  { label: '(-) Frais financiers', data: Array(12).fill(-monthly.fraisFinanciersMensuel), bold: false },
                  { label: '(-) Remb. capital', data: Array(12).fill(-monthly.rembCapitalMensuel), bold: false },
                  { label: '(+) Apport complémentaire', data: monthly.apportMois, bold: false },
                  { label: '= Solde mensuel net', data: monthly.soldeMensuel, bold: true },
                  { label: 'Solde cumulé', data: monthly.soldeCumule, bold: true },
                ].map(({ label, data, bold }) => (
                  <tr key={label} style={bold ? BOLD : undefined}>
                    <td style={{ fontWeight: bold ? 700 : 400 }}>{label}</td>
                    {data.map((v, i) => (
                      <td key={i} style={{ textAlign: 'right', fontWeight: bold ? 700 : 400, ...colored(v) }}>
                        {v !== 0 ? formatAriary(v) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  apportGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '4px 12px',
    alignItems: 'center',
  },
  apportLabel: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
  },
  apportInput: {
    width: 100,
    textAlign: 'right' as const,
    fontSize: 'var(--text-xs)',
    padding: '3px 6px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  unit: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap' as const,
  },
}
