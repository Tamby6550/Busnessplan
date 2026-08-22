import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary, formatPct } from '@/calculations/calculations'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']

export default function SummarySection() {
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
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres économiques pour afficher la synthèse.</p>
      </div>
    )
  }

  const { incomeStatement: IS, cashFlowStatement: CF, profitability: KPI, profitabilityRatios: R } = result

  const totalInvestment = company.investments.reduce((s, i) => s + i.amount, 0)
  const totalEquity = company.investments.reduce((s, i) => s + i.financedEquity, 0)
  const totalLoan = company.investments.reduce((s, i) => s + i.financedLoan, 0)
  const totalGrant = company.investments.reduce((s, i) => s + i.financedGrant, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h3 className="section-title" style={{ marginBottom: 4 }}>📄 Synthèse du business plan</h3>
        <p className="section-subtitle">Vue d'ensemble complète , à présenter à des investisseurs ou partenaires.</p>
      </div>

      {/* En-tête entreprise */}
      <div className="card">
        <div className="card-header"><span className="card-title">🏢 Informations générales</span></div>
        <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <InfoRow label="Nom de l'entreprise" value={company.name} />
          <InfoRow label="Secteur d'activité" value={company.secteur ?? '-'} />
          <InfoRow label="Promoteur" value={(company as any).promoteur ?? '-'} />
          <InfoRow label="Régime fiscal" value={settings.taxRegime} />
          <InfoRow label="Taux d'actualisation" value={`${settings.discountRate} %`} />
          <InfoRow label="Nombre de produits" value={`${company.products.length}`} />
          <InfoRow label="Effectif total" value={`${company.staffMembers.reduce((s, m) => s + m.headcount, 0)} personnes`} />
          <InfoRow label="Nombre d'investissements" value={`${company.investments.length}`} />
        </div>
      </div>

      {/* Financement initial */}
      <div className="card">
        <div className="card-header"><span className="card-title">💰 Structure du financement initial</span></div>
        <div style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <KpiMini label="Investissement total" value={formatAriary(totalInvestment)} />
            <KpiMini label="Fonds propres" value={formatAriary(totalEquity)} sub={totalInvestment > 0 ? formatPct((totalEquity / totalInvestment) * 100) : '0 %'} />
            <KpiMini label="Emprunts" value={formatAriary(totalLoan)} sub={totalInvestment > 0 ? formatPct((totalLoan / totalInvestment) * 100) : '0 %'} />
            <KpiMini label="Subventions" value={formatAriary(totalGrant)} sub={totalInvestment > 0 ? formatPct((totalGrant / totalInvestment) * 100) : '0 %'} />
          </div>
        </div>
      </div>

      {/* Tableau synthèse CA & résultats */}
      <div className="card">
        <div className="card-header"><span className="card-title">📊 Synthèse financière sur 5 ans</span></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Indicateur</th>
                {YEARS.map((y) => <th key={y} style={{ textAlign: 'right' }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Chiffre d'affaires", values: IS.revenueByYear, bold: true },
                { label: 'Marge brute', values: IS.grossMarginByYear },
                { label: 'Marge brute %', values: R.grossMarginPctByYear, isPct: true },
                { label: 'EBITDA', values: IS.ebitdaByYear, bold: true },
                { label: 'EBITDA margin %', values: R.ebitdaMarginPctByYear, isPct: true },
                { label: 'Résultat net', values: IS.netIncomeByYear, bold: true, colored: true },
                { label: 'Marge nette %', values: R.netMarginPctByYear, isPct: true, colored: true },
                { label: 'Trésorerie cumulée', values: CF.cumulativeCashByYear, bold: true, colored: true },
              ].map((row) => (
                <tr key={row.label} style={{ background: row.bold ? 'var(--color-surface-2)' : undefined }}>
                  <td style={{ fontWeight: row.bold ? 700 : 400 }}>{row.label}</td>
                  {row.values.map((v, i) => {
                    const color = row.colored
                      ? v >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                      : undefined
                    return (
                      <td key={i} style={{ textAlign: 'right', fontWeight: row.bold ? 700 : 400, color }}>
                        {row.isPct ? formatPct(v) : formatAriary(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="card">
        <div className="card-header"><span className="card-title">🎯 Indicateurs de décision</span></div>
        <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          <DecisionCard
            label="Valeur Actuelle Nette (VAN)"
            value={formatAriary(KPI.npv)}
            ok={KPI.npv >= 0}
            note={KPI.npv >= 0 ? 'Le projet crée de la valeur.' : 'Le projet détruit de la valeur.'}
          />
          <DecisionCard
            label="Taux de Rentabilité Interne (TRI)"
            value={KPI.irr !== null ? formatPct(KPI.irr) : 'N/A'}
            ok={KPI.irr !== null && KPI.irr > settings.discountRate}
            note={KPI.irr !== null
              ? KPI.irr > settings.discountRate
                ? `TRI (${formatPct(KPI.irr)}) > taux d'actualisation (${settings.discountRate} %) ✅`
                : `TRI (${formatPct(KPI.irr)}) < taux d'actualisation (${settings.discountRate} %) ⚠️`
              : 'Impossible à calculer (flux insuffisants)'}
          />
          <DecisionCard
            label="Indice de profitabilité"
            value={KPI.profitabilityIndex.toFixed(2)}
            ok={KPI.profitabilityIndex >= 1}
            note={KPI.profitabilityIndex >= 1 ? 'Chaque Ariary investi génère un gain net.' : 'Rendement insuffisant.'}
          />
          <DecisionCard
            label="Délai de récupération"
            value={KPI.paybackYear !== null ? `An ${KPI.paybackYear}` : '> 5 ans'}
            ok={KPI.paybackYear !== null && KPI.paybackYear <= 3}
            note={KPI.paybackYear !== null
              ? KPI.paybackYear <= 3 ? 'Récupération rapide ✅' : 'Récupération lente, risque modéré ⚠️'
              : 'Investissement non récupéré sur 5 ans ❌'}
          />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>{value}</div>
    </div>
  )
}

function KpiMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  )
}

function DecisionCard({ label, value, ok, note }: { label: string; value: string; ok: boolean; note: string }) {
  return (
    <div style={{
      border: `1px solid ${ok ? 'var(--color-success)' : 'var(--color-danger)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: ok ? 'var(--color-success)' : 'var(--color-danger)', marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{note}</div>
    </div>
  )
}
