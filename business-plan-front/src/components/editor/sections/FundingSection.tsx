import { useState } from 'react'
import { offlineFundingApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary } from '@/calculations/calculations'
import type { AdditionalFunding } from '@/types'

export default function FundingSection() {
  const company = useCompanyStore((s) => s.company)!
  const updateAdditionalFundings = useCompanyStore((s) => s.updateAdditionalFundings)

  // Local draft — user edits here, save sends all 5 rows at once
  const [draft, setDraft] = useState<AdditionalFunding[]>(() => {
    // Ensure we always have 5 rows (An 1-5)
    return Array.from({ length: 5 }, (_, i) => {
      const year = i + 1
      return company.additionalFundings.find((f) => f.yearNumber === year) ?? {
        yearNumber: year, equity: 0, loan: 0, loanRate: 0, loanYears: 0, grant: 0,
      }
    })
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleChange(yearIndex: number, field: keyof AdditionalFunding, value: string) {
    setDraft((prev) => {
      const next = [...prev]
      next[yearIndex] = {
        ...next[yearIndex],
        [field]: field === 'yearNumber' ? parseInt(value, 10) : parseFloat(value) || 0,
      }
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const updated = await offlineFundingApi.update(company.id, draft)
      updateAdditionalFundings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  const totalByYear = draft.map((f) => f.equity + f.loan + f.grant)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>💰 Apports complémentaires An 1-5</h3>
          <p className="section-subtitle">
            Fonds propres, emprunts et subventions additionnels pour chaque année.
            L'An 1 complète le financement des investissements.
          </p>
        </div>
        {saved && <span className="badge badge-success">✓ Enregistré</span>}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Année</th>
                <th style={{ textAlign: 'right' }}>Fonds propres (Ar)</th>
                <th style={{ textAlign: 'right' }}>Emprunt (Ar)</th>
                <th style={{ textAlign: 'right' }}>Taux emprunt (%)</th>
                <th style={{ textAlign: 'right' }}>Durée (ans)</th>
                <th style={{ textAlign: 'right' }}>Subvention (Ar)</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((row, i) => (
                <tr key={row.yearNumber}>
                  <td style={{ fontWeight: 600 }}>An {row.yearNumber}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="editable-cell" style={{ width: 110, textAlign: 'right' }}
                      value={row.equity} min={0}
                      onChange={(e) => handleChange(i, 'equity', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="editable-cell" style={{ width: 110, textAlign: 'right' }}
                      value={row.loan} min={0}
                      onChange={(e) => handleChange(i, 'loan', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="editable-cell" style={{ width: 70, textAlign: 'right' }}
                      step="0.5" value={row.loanRate} min={0}
                      onChange={(e) => handleChange(i, 'loanRate', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="editable-cell" style={{ width: 60, textAlign: 'right' }}
                      value={row.loanYears} min={0}
                      onChange={(e) => handleChange(i, 'loanYears', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="editable-cell" style={{ width: 110, textAlign: 'right' }}
                      value={row.grant} min={0}
                      onChange={(e) => handleChange(i, 'grant', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatAriary(totalByYear[i])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ fontWeight: 600 }}>Total général</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {formatAriary(totalByYear.reduce((a, b) => a + b, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : '💾 Enregistrer les apports'}
        </button>
      </div>
    </div>
  )
}
