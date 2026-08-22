import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary, formatPct } from '@/calculations/calculations'
import HelpButton from '@/components/ui/HelpButton'

const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5']

export default function ProfitabilitySection() {
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
        <div className="empty-state-icon">📈</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres dans la section Entreprise.</p>
      </div>
    )
  }

  const { profitability: KPI, economicProfitability: EKPI, incomeStatement: IS, cashFlowStatement: CF } = result

  // Seuil de rentabilité An 1
  const rev1 = IS.revenueByYear[0] ?? 0
  const vc1  = IS.materialCostByYear[0] ?? 0
  const fc1  = (IS.staffCostByYear[0] ?? 0) + (IS.expenseCostByYear[0] ?? 0) + (IS.depreciationByYear[0] ?? 0)
  const marginRate1 = rev1 > 0 ? (rev1 - vc1) / rev1 : 0
  const breakEven   = marginRate1 > 0 ? Math.round(fc1 / marginRate1) : 0

  // Rentabilité financière (fonds propres)
  const vanColor    = (KPI.npv ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
  const paybackLabel = KPI.paybackYear != null ? KPI.paybackYear + ' an(s)' : 'Non atteint sur 5 ans'
  const triLabel    = KPI.irr != null ? formatPct(KPI.irr) : 'N/A'

  // Rentabilité économique (investissement total)
  const eVanColor    = (EKPI.npv ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
  const ePaybackLabel = EKPI.paybackYear != null ? EKPI.paybackYear + ' an(s)' : 'Non atteint sur 5 ans'
  const eTriLabel    = EKPI.irr != null ? formatPct(EKPI.irr) : 'N/A'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Rentabilité</h3>
          <p className="section-subtitle">Indicateurs de performance financière du projet sur 5 ans.</p>
        </div>
        <HelpButton
          title="Indicateurs de rentabilité"
          content={"Mesures de performance financière globale du projet.\n\n=> Les indicateurs de Rentabilité (Somme des flux nets actualisés au taux d'actualisation (paramètres)): \n° VAN (Valeur Actuelle Nette) = - FP + F1/(1+r)^1 + F2/(1+r)^2 + ... + FN/(1+r)^N  \n FP : Fonds Propre \n F1,F2,FN: (CAF - Rembourcement capital) : Flux net de chaque année VAN > 0 = projet rentable. \n r : Taux d'actualisation  \n\n\n=> TRI : Taux de Rendement Interne \n 0 = - FP + [ F1 / (1+r)^1 ] + [ F2 / (1+r)^2 ] + [ F3 / (1+r)^3 ] + [ F4 / (1+r)^4 ] +....... + [FN / (1+r)^5 ] \n Déterminer r pour que le calcule soit égale à 0\n\n=> Indice de profitabilité : VAN ÷ Investissement initial. > 1 = chaque ariary investi rapporte plus d'un ariary.\n\n=> Délai de récupération : Première année où la trésorerie cumulée redevient positive.\n\n=> Seuil de rentabilité An 1 : Charges fixes ÷ Taux de marge sur coût variable. Taux de marge = (CA − Matières) ÷ CA.\n\n=> Marge brute : CA − Coût des matières premières.\n\n=> EBE : Marge brute − Charges de personnel − Charges d'exploitation.\n\n=> Résultat net / CA : Rentabilité nette en % du chiffre d'affaires."}
        />
      </div>

      {/* ─── Ligne 1 : Rentabilité financière + Rentabilité économique ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

        {/* Rentabilité financière */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rentabilité Financière</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 8 }}>
              I₀ = Fonds Propres Amortis
            </span>
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Field label="VAN">
                <span style={{ fontWeight: 800, color: vanColor, fontSize: '1.1rem' }}>
                  {formatAriary(KPI.npv ?? 0)}
                </span>
              </Field>
              <Field label="TRI">
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{triLabel}</span>
              </Field>
              <Field label="Indice de profitabilité">
                <span style={{ fontWeight: 700 }}>{(KPI.profitabilityIndex ?? 0).toFixed(2)}</span>
              </Field>
              <Field label="Délai de récupération">
                <span style={{ fontWeight: 700 }}>{paybackLabel}</span>
              </Field>
              <Field label="Seuil de rentabilité An 1">
                <span style={{ fontWeight: 700 }}>{formatAriary(breakEven)}</span>
              </Field>
              <Field label="Taux d'actualisation utilisé">
                <span>{formatPct(settings.discountRate)}</span>
              </Field>
            </div>
            <p style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Point de vue actionnaire : flux nets après remboursement de l'emprunt, rapportés aux fonds propres investis.
            </p>
          </div>
        </div>

        {/* Rentabilité économique */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rentabilité Économique</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 8 }}>
              I₀ = Total Investissement Amorti
            </span>
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Field label="VAN">
                <span style={{ fontWeight: 800, color: eVanColor, fontSize: '1.1rem' }}>
                  {formatAriary(EKPI.npv ?? 0)}
                </span>
              </Field>
              <Field label="TRI">
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{eTriLabel}</span>
              </Field>
              <Field label="Indice de profitabilité">
                <span style={{ fontWeight: 700 }}>{(EKPI.profitabilityIndex ?? 0).toFixed(2)}</span>
              </Field>
              <Field label="Délai de récupération">
                <span style={{ fontWeight: 700 }}>{ePaybackLabel}</span>
              </Field>
              <Field label="Taux de marge sur coûts variables">
                <span>{formatPct(marginRate1 * 100)}</span>
              </Field>
              <Field label="Taux d'actualisation utilisé">
                <span>{formatPct(settings.discountRate)}</span>
              </Field>
            </div>
            <p style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Point de vue projet : CAF brute (avant remboursement), rapportée au coût total de l'investissement (fonds propres + subvention + emprunt).
            </p>
          </div>
        </div>
      </div>

      {/* ─── Tableau évolution 5 ans ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header"><span className="card-title">Évolution du résultat net sur 5 ans</span></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Indicateur</th>
                {YEARS.map((y) => <th key={y} style={{ textAlign: 'right' }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              <Row label="Chiffre d'affaires" data={IS.revenueByYear} fmt={formatAriary} />
              <Row label="EBITDA" data={IS.ebitdaByYear} fmt={formatAriary} colored />
              <Row label="(-) Frais financiers" data={IS.interestByYear.map((v) => -v)} fmt={formatAriary} colored />
              <Row label="Résultat net" data={IS.netIncomeByYear} fmt={formatAriary} bold colored />
              <Row label="Trésorerie cumulée" data={CF.cumulativeCashByYear} fmt={formatAriary} bold colored />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div>{children}</div>
    </div>
  )
}

function Row({ label, data, fmt, bold, colored: useColored }: {
  label: string
  data: number[]
  fmt: (v: number) => string
  bold?: boolean
  colored?: boolean
}) {
  return (
    <tr style={{ fontWeight: bold ? 700 : 400, background: bold ? 'var(--color-surface-2)' : undefined }}>
      <td style={{ fontWeight: bold ? 700 : 400 }}>{label}</td>
      {data.map((v, i) => (
        <td key={i} style={{
          textAlign: 'right',
          fontWeight: bold ? 700 : 400,
          color: useColored ? (v < 0 ? 'var(--color-danger)' : v > 0 ? 'var(--color-success)' : undefined) : undefined,
        }}>
          {fmt(v)}
        </td>
      ))}
    </tr>
  )
}
