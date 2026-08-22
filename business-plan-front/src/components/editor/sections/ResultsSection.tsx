import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary } from '@/calculations/calculations'
import HelpButton from '@/components/ui/HelpButton'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']

export default function ResultsSection() {
  const company = useCompanyStore((s) => s.company)!
  const settings = company.settings

  const result = useMemo(() => {
    if (!settings) return null
    return computeAll(
      settings,
      company.products,
      company.materials,
      company.staffMembers,
      company.expenses,
      company.investments,
      company.additionalFundings,
    )
  }, [settings, company.products, company.materials, company.staffMembers,
      company.expenses, company.investments, company.additionalFundings])

  if (!settings || !result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres économiques pour voir les résultats.</p>
      </div>
    )
  }

  const { incomeStatement: IS, depreciationTable: DEP, loanRepaymentTable: LOAN } = result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            <i className="fas fa-table-list" style={{ marginRight: 8, color: 'var(--color-primary)' }} />
            Compte de résultat prévisionnel
          </h3>
          <p className="section-subtitle">Calculé automatiquement depuis vos données , mise à jour en temps réel.</p>
        </div>
        <HelpButton
          title="Compte de résultat"
          content={"Le compte de résultat montre la rentabilité de votre activité année par année.\n\n => Calcul du Chiffres d'Affaire (CA): \n ° Quantité An 1 = ∑ quantité par mois \n ° CA An 1 = Prix unitaire × Quantité An 1 \n ° CA An N = CA An N-1 x (1 + Taux de croissance An N)\n\n=> Calcul des Coûts Variables (CV): \n° Quantité achetée An 1 = ∑ quantité achetée par mois \n ° CV An 1 = Quantité achetée An 1 x Coût d'achat unitaire \n ° CV An N = CV N-1 x (1 + Taux de croissance) \n\n=> Calcule des Charges Personnel : \n° Charges Personnel An 1 = ( Salaire mensuel × Effectif × 12) × (1 + Charges sociales%) \n° Charges Personnel An N = Charges Personnel An N-1 x (1 + Taux de croissance N)\n\n=> Calcul des autres Charges : \n ° Autres Charges An 1 = Montant mensuel × Saisonnalité \n ° Autres Charges An N = Autres Charges An N-1 x (1 + Taux de croissance N)\n\n=> Calcul des Investissements et Amortissements : \n° Investissement = ∑ tous les biens achetés \n° Amortissement = Montant investissement ÷ Durée d'amortissement en années.\n\n=> Calcul des Frais Financiers: \n° Annuité = Montant x Taux / (1 - (1 + Taux)^(-Durée)) \n ° Intérêt = Montant * Taux \n° Rembourssement du capital = Annuité - Intérêt \n ° Fin Année N = Montant - Rembourssement du capital\n\n=> Résultat avant impôt : CA − Matières − Personnel − Charges − Amortissements − Intérêts.\n\n=> Résultat net : Résultat avant impôt × (1 − Taux d'imposition)."}
        />
      </div>
      {/* Compte de résultat */}
      <ResultTable
        title="Compte de résultat prévisionnel"
        rows={[
          { label: "Chiffre d'affaires", values: IS.revenueByYear, bold: true },
          { label: '− Coût des matières', values: IS.materialCostByYear, negative: true },
          { label: '= Marge brute', values: IS.grossMarginByYear, bold: true, highlight: true },
          { label: '− Charges de personnel', values: IS.staffCostByYear, negative: true },
          { label: "− Charges d'exploitation", values: IS.expenseCostByYear, negative: true },
          { label: '= EBITDA', values: IS.ebitdaByYear, bold: true },
          { label: '− Amortissements', values: IS.depreciationByYear, negative: true },
          { label: '= EBIT', values: IS.ebitByYear, bold: true },
          { label: "− Intérêts d'emprunt", values: IS.interestByYear, negative: true },
          { label: "= Résultat avant impôt", values: IS.ebtByYear, bold: true },
          { label: '− Impôts', values: IS.taxByYear, negative: true },
          { label: '= Résultat net', values: IS.netIncomeByYear, bold: true, highlight: true, colored: true },
        ]}
      />

      {/* Tableau d'amortissement */}
      {DEP.byInvestment.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Tableau d'amortissement linéaire</span></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Immobilisation</th>
                  <th style={{ textAlign: 'right' }}>Amort. annuel</th>
                  {YEARS.map((y) => <th key={y} style={{ textAlign: 'right' }}>VNC {y}</th>)}
                </tr>
              </thead>
              <tbody>
                {DEP.byInvestment.map((row) => {
                  const inv = company.investments.find((i) => i.id === row.investmentId)
                  return (
                    <tr key={row.investmentId}>
                      <td>{inv?.name ?? `Inv. #${row.investmentId}`}</td>
                      <td style={{ textAlign: 'right' }}>{formatAriary(row.annualDepreciation)}</td>
                      {row.yearlyBook.map((v, i) => <td key={i} style={{ textAlign: 'right' }}>{formatAriary(v)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 600 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAriary(DEP.totalAnnualDepreciation)}</td>
                  {YEARS.map((_, i) => <td key={i} />)}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tableau de remboursement des emprunts */}
      {LOAN.byLoan.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tableau de remboursement des emprunts</span>
          </div>
          <div className="table-wrapper">
            {LOAN.byLoan.map((loan, li) => (
              <div key={li} style={{ marginBottom: li < LOAN.byLoan.length - 1 ? 'var(--space-4)' : 0 }}>
                {/* En-tête emprunt */}
                <div style={{
                  display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
                  padding: '6px 12px',
                  background: 'var(--color-primary)', color: '#fff',
                  fontSize: 'var(--text-sm)', fontWeight: 700,
                }}>
                  <span>{loan.label}</span>
                  <span style={{ fontWeight: 400, opacity: 0.85 }}>
                    Principal : {formatAriary(loan.principal)} · Taux : {loan.rate.toFixed(1)} % · Durée : {loan.years} ans
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                    Annuité : {formatAriary(
                      (loan.annualPayments[0]?.capital ?? 0) + (loan.annualPayments[0]?.interest ?? 0)
                    )} / an
                  </span>
                </div>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Rubrique</th>
                      {YEARS.map((y) => <th key={y} style={{ textAlign: 'right', minWidth: 120 }}>{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Capital remboursé */}
                    <tr>
                      <td style={{ paddingLeft: 16, color: 'var(--color-text-muted)' }}>Capital remboursé</td>
                      {YEARS.map((_, yi) => (
                        <td key={yi} style={{ textAlign: 'right' }}>
                          {formatAriary(loan.annualPayments[yi]?.capital ?? 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Intérêts */}
                    <tr>
                      <td style={{ paddingLeft: 16, color: 'var(--color-danger)' }}>Intérêts payés</td>
                      {YEARS.map((_, yi) => (
                        <td key={yi} style={{ textAlign: 'right', color: 'var(--color-danger)' }}>
                          {formatAriary(loan.annualPayments[yi]?.interest ?? 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Solde restant */}
                    <tr style={{ background: 'var(--color-surface-2)', fontWeight: 600 }}>
                      <td style={{ paddingLeft: 16 }}>Solde restant dû</td>
                      {YEARS.map((_, yi) => (
                        <td key={yi} style={{ textAlign: 'right' }}>
                          {formatAriary(loan.annualPayments[yi]?.balance ?? 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Totaux si plusieurs emprunts */}
            {LOAN.byLoan.length > 1 && (
              <table style={{ width: '100%', marginTop: 'var(--space-3)', borderTop: '2px solid var(--color-border)' }}>
                <tbody>
                  <tr>
                    <td style={{ minWidth: 200, fontWeight: 700 }}>Total capital remboursé</td>
                    {LOAN.totalCapitalByYear.map((v, i) => (
                      <td key={i} style={{ textAlign: 'right', minWidth: 120, fontWeight: 700 }}>{formatAriary(v)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>Total intérêts payés</td>
                    {LOAN.totalInterestByYear.map((v, i) => (
                      <td key={i} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>{formatAriary(v)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-component : generic result table ─────────────────────────────────────

interface TableRow {
  label: string
  values: number[]
  bold?: boolean
  highlight?: boolean
  colored?: boolean
  negative?: boolean
}

function ResultTable({ title, rows }: { title: string; rows: TableRow[] }) {
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Libellé</th>
              {YEARS.map((y) => <th key={y} style={{ textAlign: 'right' }}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bg = row.highlight ? 'var(--color-surface-2)' : undefined
              return (
                <tr key={row.label} style={{ background: bg }}>
                  <td style={{ fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                  {row.values.map((v, i) => {
                    const color = row.colored
                      ? (row.negative
                          ? (v < 0 ? 'var(--color-danger)' : 'var(--color-success)')
                          : (v >= 0 ? 'var(--color-success)' : 'var(--color-danger)'))
                      : undefined
                    return (
                      <td key={i} style={{ textAlign: 'right', fontWeight: row.bold ? 700 : 400, color }}>
                        {formatAriary(v)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
