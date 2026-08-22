import { useState, useMemo, type FormEvent } from 'react'
import { offlineSettingsApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { computeAll, formatAriary, buildInflationFactors } from '@/calculations/calculations'
import type { CompanySettings } from '@/types'

const DEFAULT_SETTINGS: CompanySettings = {
  infl2: 3, infl3: 3, infl4: 3, infl5: 3,
  discountRate: 10,
  taxRegime: 'IR',
  taxRate: 20,
  taxRateIs: 20,
  fondsRoulement: 0,
}

const YEAR_COLORS = ['#3a7d2e', '#2563eb', '#b45309', '#7c3aed']

export default function ProjectionSection() {
  const company       = useCompanyStore((s) => s.company)!
  const updateSettings = useCompanyStore((s) => s.updateSettings)

  const [form, setForm]     = useState<CompanySettings>(company.settings ?? DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  // Prévisualisation live avec les taux du formulaire (pas encore sauvegardés)
  const preview = useMemo(() => {
    if (!company.settings) return null
    const settingsPreview = { ...company.settings, ...form }
    return computeAll(
      settingsPreview,
      company.products,
      company.materials,
      company.staffMembers,
      company.expenses,
      company.investments,
      company.additionalFundings,
    )
  }, [form, company])

  function handleChange(field: keyof CompanySettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
    setSaved(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const updated = await offlineSettingsApi.update(company.id, form)
      updateSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  const inflFields = [
    { field: 'infl2' as const, year: 2, label: 'An 2', color: YEAR_COLORS[0] },
    { field: 'infl3' as const, year: 3, label: 'An 3', color: YEAR_COLORS[1] },
    { field: 'infl4' as const, year: 4, label: 'An 4', color: YEAR_COLORS[2] },
    { field: 'infl5' as const, year: 5, label: 'An 5', color: YEAR_COLORS[3] },
  ]

  // Facteurs cumulatifs basés sur le formulaire
  const factors = buildInflationFactors(form as CompanySettings)
  const factorArr = [factors.year1, factors.year2, factors.year3, factors.year4, factors.year5]

  const IS  = preview?.incomeStatement
  const CF  = preview?.cashFlowStatement

  const colored = (v: number): React.CSSProperties => ({
    color: v < 0 ? 'var(--color-danger)' : v > 0 ? 'var(--color-success)' : 'var(--color-text-muted)',
    fontWeight: 700,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ─── En-tête ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>📈 Projection 5 ans</h3>
          <p className="section-subtitle">
            Hypothèses d'inflation appliquées aux charges et matières pour les années 2 à 5.
          </p>
        </div>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
            <i className="fas fa-check-circle" />
            Enregistré
          </div>
        )}
      </div>

      {/* ─── Formulaire + note ─────────────────────────────────────────────── */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>

          {/* Inputs inflation */}
          <div className="card">
            <div className="card-header"><span className="card-title">Inflation globale par année</span></div>
            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {inflFields.map(({ field, label, color }) => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {/* Badge année */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: color + '18',
                    border: `2px solid ${color}40`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taux</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color }}>{label}</span>
                  </div>

                  {/* Slider + input */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      type="range"
                      min="0" max="30" step="0.5"
                      value={form[field] ?? 0}
                      onChange={(e) => handleChange(field, e.target.value)}
                      style={{ width: '100%', accentColor: color }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      <span>0 %</span>
                      <span>30 %</span>
                    </div>
                  </div>

                  {/* Valeur numérique */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 72, textAlign: 'right', fontWeight: 700, color }}
                      step="0.1" min="0" max="100"
                      value={form[field] ?? 0}
                      onChange={(e) => handleChange(field, e.target.value)}
                    />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note + facteurs cumulatifs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Note</span></div>
              <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
                Ces taux s'appliquent aux <strong>charges d'exploitation</strong> et aux <strong>matières premières</strong>.
                Les produits et matières ont leurs propres taux de croissance individuels dans leurs sections respectives.
              </div>
            </div>

            {/* Facteurs cumulatifs */}
            <div className="card">
              <div className="card-header"><span className="card-title">Facteurs cumulatifs</span></div>
              <div style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
                  {factorArr.map((f, i) => (
                    <div key={i} style={{
                      textAlign: 'center',
                      padding: 'var(--space-2)',
                      background: i === 0 ? 'var(--color-surface-2)' : YEAR_COLORS[i - 1] + '12',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${i === 0 ? 'var(--color-border)' : YEAR_COLORS[i - 1] + '30'}`,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>An {i + 1}</div>
                      <div style={{
                        fontSize: 'var(--text-sm)', fontWeight: 700,
                        color: i === 0 ? 'var(--color-text-muted)' : YEAR_COLORS[i - 1],
                      }}>
                        ×{f.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', margin: 'var(--space-2) 0 0' }}>
                  An 1 = base × 1.000 - chaque année cumule le taux précédent.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton save */}
        <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving}>
            {isSaving
              ? <><span className="spinner" style={{ width: 16, height: 16, display: 'inline-block', marginRight: 8 }} />Enregistrement…</>
              : <><i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer</>
            }
          </button>
        </div>
      </form>

      {/* ─── Tableau de prévisualisation live ──────────────────────────────── */}
      {IS && CF && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Prévisualisation de l'impact sur 5 ans</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Mise à jour en temps réel
            </span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 210 }}>Indicateur</th>
                  <th style={{ textAlign: 'right', minWidth: 110 }}>An 1 (base)</th>
                  {inflFields.map(({ label, color }) => (
                    <th key={label} style={{ textAlign: 'right', minWidth: 110, color }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Chiffre d'affaires",   data: IS.revenueByYear,      fmt: formatAriary, bold: true  },
                  { label: 'Charges de personnel',  data: IS.staffCostByYear,    fmt: formatAriary, bold: false },
                  { label: "Charges d'exploitation",data: IS.expenseCostByYear,  fmt: formatAriary, bold: false },
                  { label: 'EBITDA',                data: IS.ebitdaByYear,       fmt: formatAriary, bold: true  },
                  { label: 'Résultat net',          data: IS.netIncomeByYear,    fmt: formatAriary, bold: true, isColored: true },
                  { label: 'Trésorerie cumulée',    data: CF.cumulativeCashByYear, fmt: formatAriary, bold: true, isColored: true },
                ].map(({ label, data, fmt, bold, isColored }) => (
                  <tr key={label} style={{ fontWeight: bold ? 700 : 400, background: bold ? 'var(--color-surface-2)' : undefined }}>
                    <td style={{ fontWeight: bold ? 700 : 400 }}>{label}</td>
                    {data.map((v, i) => (
                      <td key={i} style={{
                        textAlign: 'right',
                        fontWeight: bold ? 700 : 400,
                        ...(isColored ? colored(v) : {}),
                      }}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Ligne facteur inflation */}
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Facteur inflation appliqué</td>
                  {factorArr.map((f, i) => (
                    <td key={i} style={{
                      textAlign: 'right',
                      fontSize: 'var(--text-xs)',
                      color: i === 0 ? 'var(--color-text-muted)' : YEAR_COLORS[i - 1],
                      fontWeight: 600,
                    }}>
                      ×{f.toFixed(3)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
