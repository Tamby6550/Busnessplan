import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary } from '@/calculations/calculations'
import HelpButton from '@/components/ui/HelpButton'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']

export default function FinancingSection() {
  const company = useCompanyStore((s) => s.company)!
  const settings = company.settings

  const result = useMemo(() => {
    if (!settings) return null
    return computeAll(settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, company.additionalFundings)
  }, [settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, company.additionalFundings])

  if (!settings || !result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres dans la section Entreprise.</p>
      </div>
    )
  }

  const { incomeStatement: IS, loanRepaymentTable: LR } = result

  const invEquity = company.investments.reduce((s, i) => s + i.financedEquity, 0)
  const invLoan   = company.investments.reduce((s, i) => s + i.financedLoan, 0)
  const invGrant  = company.investments.reduce((s, i) => s + i.financedGrant, 0)
  const invTotal  = company.investments.reduce((s, i) => s + i.amount, 0)
  const fdr       = settings.fondsRoulement ?? 0
  const tresoInitiale = invEquity + invLoan + invGrant - invTotal + fdr

  const afs = [1, 2, 3, 4, 5].map((yr) => {
    const af = company.additionalFundings.find((f) => f.yearNumber === yr)
    return af ?? { yearNumber: yr, equity: 0, loan: 0, loanRate: 0, loanYears: 5, grant: 0 }
  })

  const addEquity = afs.map((af) => af.equity)
  const addLoan   = afs.map((af) => af.loan)
  const addGrant  = afs.map((af) => af.grant)
  const addTotal  = afs.map((af) => af.equity + af.loan + af.grant)

  // Flux opérationnel = CAF - remb. capital
  const opCF = IS.netIncomeByYear.map((n, y) => n + IS.depreciationByYear[y] - LR.totalCapitalByYear[y])

  // Trésorerie cumulée
  const cashCum: number[] = []
  let running = tresoInitiale
  for (let y = 0; y < 5; y++) {
    running += opCF[y] + addTotal[y]
    cashCum.push(Math.round(running))
  }

  // Trésorerie avant apport (sans l'apport de l'année)
  const tresoBefore = [0, 1, 2, 3, 4].map((y) => {
    const prev = y === 0 ? tresoInitiale : cashCum[y - 1]
    return Math.round(prev + opCF[y])
  })

  const pct = (v: number, total: number) => total > 0 ? `${((v / total) * 100).toFixed(1)} %` : '-'
  const colored = (v: number): React.CSSProperties =>
    ({ color: v < 0 ? 'var(--color-danger)' : v > 0 ? 'var(--color-success)' : undefined })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Plan de financement</h3>
          <p className="section-subtitle">Financement initial (An 0) et apports complémentaires annuels si la trésorerie est déficitaire.</p>
        </div>
        <HelpButton
          title="Plan de financement"
          content={"Équilibre entre les besoins et les ressources financières.\n\n── EMPLOIS ──\n=> Investissements : Total des montants saisis dans la section Investissements.\n\n=> Fonds de roulement : Trésorerie de démarrage saisie dans les paramètres.\n\n=> Remboursement emprunt : Capital remboursé annuellement (annuité constante).\n\n── RESSOURCES ──\n=> Fonds propres : Apports en capital des associés/promoteurs.\n\n=> Emprunts : Montants empruntés, remboursables sur la durée définie.\n\n=> Subventions : Aides publiques non remboursables.\n\n=> CAF : Résultat net + Amortissements (cash généré par l'activité).\n\n=> Apports complémentaires : Nouveaux fonds ou emprunts prévus pour An 2 à An 5.\n\n=> Solde : Ressources − Emplois. Doit être ≥ 0 chaque année."}
        />
      </div>

      {/* ─── Ligne 1 : Financement initial + Récapitulatif apports ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

        {/* Financement initial */}
        <div className="card">
          <div className="card-header"><span className="card-title">💰 Financement initial (An 0)</span></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Montant (Ar)</th>
                  <th style={{ textAlign: 'right' }}>% total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fonds propres (investissements)</td>
                  <td style={{ textAlign: 'right' }}>{formatAriary(invEquity)}</td>
                  <td style={{ textAlign: 'right' }}>{pct(invEquity, invTotal)}</td>
                </tr>
                <tr>
                  <td>Emprunts initiaux</td>
                  <td style={{ textAlign: 'right' }}>{formatAriary(invLoan)}</td>
                  <td style={{ textAlign: 'right' }}>{pct(invLoan, invTotal)}</td>
                </tr>
                <tr>
                  <td>Subventions initiales</td>
                  <td style={{ textAlign: 'right' }}>{formatAriary(invGrant)}</td>
                  <td style={{ textAlign: 'right' }}>{pct(invGrant, invTotal)}</td>
                </tr>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
                  <td>Total financement investissements</td>
                  <td style={{ textAlign: 'right' }}>{formatAriary(invTotal)}</td>
                  <td style={{ textAlign: 'right' }}>100 %</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--color-text-muted)' }}>+ Fonds de roulement initial</td>
                  <td style={{ textAlign: 'right' }}>{formatAriary(fdr)}</td>
                  <td />
                </tr>
                <tr style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                  <td>→ Trésorerie de départ</td>
                  <td colSpan={2} style={{ textAlign: 'right' }}>{formatAriary(tresoInitiale)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Récapitulatif apports */}
        <div className="card">
          <div className="card-header"><span className="card-title">📊 Récapitulatif des apports</span></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  {YEARS.map((y) => <th key={y} style={{ textAlign: 'right' }}>{y}</th>)}
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Fonds propres additionnels', data: addEquity },
                  { label: 'Emprunts additionnels',      data: addLoan   },
                  { label: 'Subventions additionnelles', data: addGrant  },
                ].map(({ label, data }) => (
                  <tr key={label}>
                    <th style={{ fontWeight: 400 }}>{label}</th>
                    {data.map((v, i) => <td key={i} style={{ textAlign: 'right' }}>{formatAriary(v)}</td>)}
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatAriary(data.reduce((s, v) => s + v, 0))}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                  <th>Total apports</th>
                  {addTotal.map((v, i) => (
                    <td key={i} style={{ textAlign: 'right' }}>{formatAriary(v)}</td>
                  ))}
                  <td style={{ textAlign: 'right' }}>
                    {formatAriary(addTotal.reduce((s, v) => s + v, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Apports complémentaires annuels ────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📈 Apports complémentaires annuels - Trésorerie avant/après</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Année</th>
                <th style={{ textAlign: 'right' }}>Tréso. avant apport</th>
                <th style={{ textAlign: 'right' }}>Fonds propres (Ar)</th>
                <th style={{ textAlign: 'right' }}>Emprunt (Ar)</th>
                <th style={{ textAlign: 'right' }}>Subvention (Ar)</th>
                <th style={{ textAlign: 'right' }}>Total apport</th>
                <th style={{ textAlign: 'right' }}>Tréso. après</th>
              </tr>
            </thead>
            <tbody>
              {afs.map((af, i) => {
                const neg = tresoBefore[i] < 0
                return (
                  <tr key={i}>
                    <td>
                      <strong>An {i + 1}</strong>
                      {neg && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginLeft: 6 }}>⚠</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, ...colored(tresoBefore[i]) }}>
                      {formatAriary(tresoBefore[i])}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatAriary(af.equity)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAriary(af.loan)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAriary(af.grant)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAriary(addTotal[i])}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, ...colored(cashCum[i]) }}>
                      {formatAriary(cashCum[i])}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', padding: 'var(--space-3) var(--space-4)' }}>
          ⚠ = trésorerie déficitaire avant apport. Pour modifier les apports, allez dans la section <strong>Trésorerie</strong>.
        </p>
      </div>
    </div>
  )
}
