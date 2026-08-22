import { useMemo } from 'react'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary, formatPct } from '@/calculations/calculations'

export default function SyntheseSection() {
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
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">Paramètres manquants</div>
        <p className="empty-state-desc">Définissez les paramètres économiques pour afficher la synthèse.</p>
      </div>
    )
  }

  const { incomeStatement: IS, profitability: KPI } = result

  const rev1  = IS.revenueByYear[0]   ?? 0
  const rev5  = IS.revenueByYear[4]   ?? 0
  const net1  = IS.netIncomeByYear[0] ?? 0
  const net5  = IS.netIncomeByYear[4] ?? 0
  const van   = KPI.npv ?? 0
  const tri   = KPI.irr
  const payback = KPI.paybackYear

  const vc1  = IS.materialCostByYear[0]  ?? 0
  const fc1  = (IS.staffCostByYear[0]    ?? 0)
             + (IS.expenseCostByYear[0]  ?? 0)
             + (IS.depreciationByYear[0] ?? 0)
  const mr1  = rev1 > 0 ? (rev1 - vc1) / rev1 : 0
  const breakEven = mr1 > 0 ? Math.round(fc1 / mr1) : 0

  const coloredStyle = (v: number): React.CSSProperties => ({
    fontWeight: 700,
    color: v >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h3 className="section-title" style={{ marginBottom: 4 }}>Synthèse</h3>
        <p className="section-subtitle">Résumé exécutif des principaux indicateurs financiers.</p>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Résumé financier</span></div>
        <div style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Field label="CA An 1">
              <span style={{ fontWeight: 700 }}>{formatAriary(rev1)}</span>
            </Field>
            <Field label="CA An 5">
              <span style={{ fontWeight: 700 }}>{formatAriary(rev5)}</span>
            </Field>
            <Field label="Résultat net An 1">
              <span style={coloredStyle(net1)}>{formatAriary(net1)}</span>
            </Field>
            <Field label="Résultat net An 5">
              <span style={coloredStyle(net5)}>{formatAriary(net5)}</span>
            </Field>
            <Field label="VAN">
              <span style={coloredStyle(van)}>{formatAriary(van)}</span>
            </Field>
            <Field label="TRI">
              <span style={{ fontWeight: 700 }}>{tri != null ? formatPct(tri) : 'N/A'}</span>
            </Field>
            <Field label="Seuil de rentabilité">
              <span>{formatAriary(breakEven)}</span>
            </Field>
            <Field label="Délai de récupération">
              <span>{payback != null ? payback + ' an(s)' : 'Non atteint'}</span>
            </Field>
          </div>
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
