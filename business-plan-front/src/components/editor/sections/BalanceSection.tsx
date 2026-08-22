import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary } from '@/calculations/calculations'
import HelpButton from '@/components/ui/HelpButton'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']

export default function BalanceSection() {
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
        <div className="empty-state-icon">⚖️</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres dans la section Entreprise.</p>
      </div>
    )
  }

  const { balanceSheet: B, incomeStatement: IS, cashFlowStatement: CF } = result

  
  const netFixed = YEARS.map((_, y) =>
    result.depreciationTable.byInvestment.reduce((sum, row) => sum + (row.yearlyBook[y] ?? 0), 0),
  )
  const cashByYear = B.cashByYear

  
  const totalInvestTerrain = company.investmentTerrains.reduce((s, i) => s + i.amount, 0)

  const totalActif = YEARS.map((_, y) => netFixed[y] + totalInvestTerrain + Math.max(0, cashByYear[y]))


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
  
  const bfr = settings.fondsRoulement ?? 0
  const capitalPropres = YEARS.map((_, y) =>
    cumEquity[y] + cumGrant[y] + totalInvestTerrain + bfr + cumResult[y] + IS.netIncomeByYear[y],
  )


  const dettes = B.loanBalanceByYear

  // Total passif
  const totalPassif = YEARS.map((_, y) => capitalPropres[y] + Math.max(0, dettes[y]))

  const BOLD: React.CSSProperties = { fontWeight: 700, background: 'var(--color-surface-2)' }
  const colored = (v: number) =>
    ({ color: v < 0 ? 'var(--color-danger)' : undefined } as React.CSSProperties)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            <i className="fas fa-scale-balanced" style={{ marginRight: 8, color: '#3a7d2e' }} />
            Bilans prévisionnels
          </h3>
          <p className="section-subtitle">Bilan simplifié sur 5 ans , Actif = Passif</p>
        </div>
        <HelpButton
          title="Bilan prévisionnel"
          content={"Situation patrimoniale de l'entreprise à fin de chaque année.\n\n── ACTIF ──\n=> Immobilisations nettes (VNC) : Valeur d'achat moins les amortissements cumulés depuis l'acquisition.\n\n=> Trésorerie active : Trésorerie initiale + cumul des flux de trésorerie jusqu'à l'année N (si positif).\n\n── PASSIF ──\n=> Capitaux propres : Fonds propres initiaux + résultats nets cumulés de chaque année.\n\n=> Dettes financières : Capital restant dû sur les emprunts = Capital initial − remboursements cumulés.\n\n=> Découvert : Si la trésorerie est négative, elle apparaît au passif.\n\n=> Équilibre garanti : Total Actif = Total Passif par construction."}
        />
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Bilan prévisionnel (An 1 à An 5)</span></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Rubrique</th>
                {YEARS.map((y) => <th key={y} style={{ textAlign: 'right', minWidth: 130 }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* ACTIF */}
              <tr>
                <td colSpan={6} style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-xs)', padding: '4px 12px' }}>
                  ACTIF
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20 }}>Immobilisations nettes (VNC)</td>
                {netFixed.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>{formatAriary(v)}</td>
                ))}
              </tr>
              {totalInvestTerrain > 0 && (
                <tr>
                  <td style={{ paddingLeft: 20 }}>Total investissement non amorti</td>
                  {YEARS.map((_, i) => (
                    <td key={i} style={{ textAlign: 'right' }}>{formatAriary(totalInvestTerrain)}</td>
                  ))}
                </tr>
              )}
              <tr>
                <td style={{ paddingLeft: 20 }}>Trésorerie</td>
                {cashByYear.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>
              <tr style={BOLD}>
                <td>= TOTAL ACTIF</td>
                {totalActif.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>

              {/* PASSIF */}
              <tr>
                <td colSpan={6} style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-xs)', padding: '4px 12px' }}>
                  PASSIF
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20 }}>Capitaux propres</td>
                {capitalPropres.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>
              <tr>
                <td style={{ paddingLeft: 20 }}>Dettes financières</td>
                {dettes.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>{formatAriary(v)}</td>
                ))}
              </tr>
              <tr style={BOLD}>
                <td>= TOTAL PASSIF</td>
                {totalPassif.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>

              {/* Vérification équilibre */}
              <tr>
                <td style={{ paddingLeft: 20, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  Écart Actif - Passif
                </td>
                {YEARS.map((_, i) => {
                  const ecart = totalActif[i] - totalPassif[i]
                  return (
                    <td key={i} style={{ textAlign: 'right', fontSize: 'var(--text-xs)', color: Math.abs(ecart) < 100 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {Math.abs(ecart) < 100 ? '✓ Équilibré' : formatAriary(ecart)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Détail capitaux propres */}
      <div className="card">
        <div className="card-header"><span className="card-title">Détail des capitaux propres</span></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Rubrique</th>
                {YEARS.map((y) => <th key={y} style={{ textAlign: 'right', minWidth: 130 }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fonds propres cumulés (+ apports complémentaires)</td>
                {YEARS.map((_, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>{formatAriary(cumEquity[i])}</td>
                ))}
              </tr>
              <tr>
                <td>Subventions cumulées</td>
                {YEARS.map((_, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>{formatAriary(cumGrant[i])}</td>
                ))}
              </tr>
              {totalInvestTerrain > 0 && (
                <tr>
                  <td>Total investissement non amorti</td>
                  {YEARS.map((_, i) => (
                    <td key={i} style={{ textAlign: 'right' }}>{formatAriary(totalInvestTerrain)}</td>
                  ))}
                </tr>
              )}
              {bfr > 0 && (
                <tr>
                  <td>Fonds de roulement initial</td>
                  {YEARS.map((_, i) => (
                    <td key={i} style={{ textAlign: 'right' }}>{formatAriary(bfr)}</td>
                  ))}
                </tr>
              )}
              <tr>
                <td>Résultats antérieurs cumulés</td>
                {cumResult.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>
              <tr>
                <td>Résultat de l'exercice</td>
                {IS.netIncomeByYear.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>
              <tr style={BOLD}>
                <td>= Total capitaux propres</td>
                {capitalPropres.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', ...colored(v) }}>{formatAriary(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
