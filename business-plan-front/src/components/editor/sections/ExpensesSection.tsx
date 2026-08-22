import { useState, useRef } from 'react'
import { offlineExpenseApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary, expenseAnnualTotal } from '@/calculations/calculations'
import type { Expense } from '@/types'
import NumInput, { parseFormattedNum } from '@/components/ui/NumInput'
import HelpButton from '@/components/ui/HelpButton'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const GROWTH_YEARS = ['An 2','An 3','An 4','An 5']

function allSame(values: number[]): boolean {
  return values.length > 0 && values.every((v) => v === values[0])
}

interface UniformState { enabled: boolean; value: number }

function initUniformAmount(expenses: Expense[]): Record<number, UniformState> {
  const map: Record<number, UniformState> = {}
  expenses.forEach((e) => {
    map[e.id] = { enabled: allSame(e.monthlyAmounts), value: e.monthlyAmounts[0] ?? 0 }
  })
  return map
}

function initUniformQty(expenses: Expense[]): Record<number, UniformState> {
  const map: Record<number, UniformState> = {}
  expenses.forEach((e) => {
    map[e.id] = { enabled: allSame(e.seasonality), value: e.seasonality[0] ?? 0 }
  })
  return map
}

export default function ExpensesSection() {
  const company = useCompanyStore((s) => s.company)!
  const addExpense = useCompanyStore((s) => s.addExpense)
  const updateExpense = useCompanyStore((s) => s.updateExpense)
  const removeExpense = useCompanyStore((s) => s.removeExpense)

  const [newName, setNewName]   = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const arrayRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [uniformAmount, setUniformAmount] = useState<Record<number, UniformState>>(() =>
    initUniformAmount(company.expenses)
  )
  const [uniformQty, setUniformQty] = useState<Record<number, UniformState>>(() =>
    initUniformQty(company.expenses)
  )


  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const exp = await offlineExpenseApi.create(company.id, { name: newName.trim() })
      addExpense(exp)
      setUniformAmount((prev) => ({ ...prev, [exp.id]: { enabled: true, value: 0 } }))
      setUniformQty((prev) => ({ ...prev, [exp.id]: { enabled: true, value: 1 } }))
      setNewName('')
    } finally { setIsAdding(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette charge ?')) return
    await offlineExpenseApi.delete(id, company.id)
    removeExpense(id)
  }

  // ── Tout est désormais sauvegardé via "Enregistrer tout" — pas d'appel API au blur ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleAmount(_expId: number, _idx: number, _val: number) {}

  function handleUniformAmount(expId: number, val: number) {
    setUniformAmount((prev) => ({ ...prev, [expId]: { enabled: true, value: val } }))
  }

  function toggleAmountMode(exp: Expense) {
    setUniformAmount((prev) => {
      const cur = prev[exp.id] ?? { enabled: false, value: 0 }
      return { ...prev, [exp.id]: { enabled: !cur.enabled, value: exp.monthlyAmounts[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleSeasonality(_expId: number, _idx: number, _val: number) {}

  function handleUniformQty(expId: number, val: number) {
    setUniformQty((prev) => ({ ...prev, [expId]: { enabled: true, value: val } }))
  }

  function toggleQtyMode(exp: Expense) {
    setUniformQty((prev) => {
      const cur = prev[exp.id] ?? { enabled: false, value: 0 }
      return { ...prev, [exp.id]: { enabled: !cur.enabled, value: exp.seasonality[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleInflation(_expId: number, _idx: number, _val: number) {}

  async function handleSaveAll() {
    setSaving(true)
    try {
      for (const exp of useCompanyStore.getState().company?.expenses ?? []) {
        const name = arrayRefs.current[`${exp.id}-name`]?.value?.trim() || exp.name
        const ua = uniformAmount[exp.id]
        const monthlyAmounts = ua?.enabled
          ? Array(12).fill(ua.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFormattedNum(arrayRefs.current[`${exp.id}-amt-${i}`]?.value || '0')
            )
        const uq = uniformQty[exp.id]
        const seasonality = uq?.enabled
          ? Array(12).fill(uq.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFloat(arrayRefs.current[`${exp.id}-seas-${i}`]?.value || '0') || 0,
            )
        const inflationGrowth = Array.from({ length: 4 }, (_, i) =>
          parseFloat(arrayRefs.current[`${exp.id}-inf-${i}`]?.value || '0') || 0,
        ).concat([exp.inflationGrowth[4] ?? 0])
        const updated = await offlineExpenseApi.update(exp.id, company.id, { name, monthlyAmounts, seasonality, inflationGrowth })
        updateExpense(exp.id, updated)
      }
      setSaved(true)
      setToast('Modifications enregistrées avec succès !')
      setTimeout(() => { setSaved(false); setToast(null) }, 3000)
    } finally {
      setSaving(false)
    }
  }

  const totalCharges = company.expenses.reduce((sum, e) => sum + expenseAnnualTotal(e), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>💸 Charges d'exploitation</h3>
            <p className="section-subtitle">Montant mensuel, quantité mensuelle et taux de croissance annuel An 2-5.</p>
          </div>
          <HelpButton
            title="Charges d'exploitation"
            content={"Listez toutes vos charges fixes et variables, mois par mois.\n\n=> Montant / mois : Le montant de la charge peut varier selon le mois. Mode uniforme = même montant toute l'année, mode détaillé = un montant différent par mois.\n\n=> Quantité : Coefficient mensuel si la charge varie selon les saisons (1 = normal, 0 = pas de charge ce mois, valeur décimale possible, ex. charge trimestrielle = 0.33).\n\n=> Croissance annuelle : Évolution de la charge sur 5 ans (inflation incluse)."}
          />
        </div>
      </div>

      {/* KPI Total charges */}
      {company.expenses.length > 0 && (
        <div className="kpi-card" style={{ marginBottom: 'var(--space-5)', background: '#fdf4ff', border: '1px solid #d8b4fe' }}>
          <div className="kpi-label">Total Charges d'exploitation An 1</div>
          <div className="kpi-value" style={{ color: '#7e22ce' }}>{formatAriary(totalCharges)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: '#7e22ce', marginTop: 4 }}>
            {company.expenses.length} charge{company.expenses.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Barre ajout + bouton enregistrer unique */}
      <div style={addBarStyle}>
        <input
          className="form-input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="Nom de la charge…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={isAdding || !newName.trim()}>
          {isAdding ? '…' : '+ Ajouter'}
        </button>
        {company.expenses.length > 0 && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            style={saved ? saveAllBtnOk : saveAllBtn}
          >
            {saving
              ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Enregistrement...</>
              : saved
              ? <><i className="fas fa-check-circle" style={{ marginRight: 6 }} />Enregistré !</>
              : <><i className="fas fa-floppy-disk" style={{ marginRight: 6 }} />Enregistrer tout</>
            }
          </button>
        )}
      </div>

      {company.expenses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">Aucune charge</div>
          <p className="empty-state-desc">Loyer, électricité, communication…</p>
        </div>
      )}

      {company.expenses.map((exp) => {
        const ua = uniformAmount[exp.id] ?? { enabled: false, value: 0 }
        const uq = uniformQty[exp.id] ?? { enabled: false, value: 0 }

        return (
        <div key={exp.id} className="card" style={{ marginBottom: 'var(--space-5)' }}>
          {/* En-tête carte */}
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <input
                className="form-input"
                style={{ fontWeight: 600, maxWidth: 240 }}
                defaultValue={exp.name}
                ref={(el) => { arrayRefs.current[`${exp.id}-name`] = el }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="kpi-card" style={{ padding: '4px 10px' }}>
                <div className="kpi-label">Total An 1</div>
                <div className="kpi-value" style={{ fontSize: 'var(--text-base)' }}>
                  {formatAriary(expenseAnnualTotal(exp))}
                </div>
              </div>
              <button
                onClick={() => handleDelete(exp.id)}
                title="Supprimer cette charge"
                style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '7px 12px', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>✕</span>
              </button>
            </div>
          </div>

          {/* Tableau montant + quantité + croissance */}
          <div className="card-body" style={{ overflowX: 'auto' }}>

            {/* Toggle mode uniforme : montant */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Montant différent par mois</span>
                <div
                  onClick={() => toggleAmountMode(exp)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                    background: ua.enabled ? 'var(--color-primary)' : '#d1d5db',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: ua.enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: ua.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: ua.enabled ? 700 : 400 }}>
                  Même montant toute l'année
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quantité différente par mois</span>
                <div
                  onClick={() => toggleQtyMode(exp)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                    background: uq.enabled ? 'var(--color-primary)' : '#d1d5db',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: uq.enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: uq.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: uq.enabled ? 700 : 400 }}>
                  Même quantité tous les mois
                </span>
              </div>
            </div>

            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={thLabel}>Libellé</th>
                  {MONTHS.map((m) => <th key={m} style={thCell}>{m}</th>)}
                  <th style={thTotal}>Total An 1</th>
                  <th style={thSep} />
                  {GROWTH_YEARS.map((y) => (
                    <th key={y} style={{ ...thCell, color: 'var(--color-primary)' }}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Montant / mois ── */}
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <td style={tdLabel}>Montant / mois (Ar)</td>
                  {ua.enabled ? (
                    <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                      <NumInput
                        className="editable-cell"
                        style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                        step={1} min={0}
                        defaultValue={ua.value}
                        key={`${exp.id}-uniform-amt`}
                        onBlur={(v) => handleUniformAmount(exp.id, v)}
                      />
                    </td>
                  ) : (
                    exp.monthlyAmounts.map((v, i) => (
                      <td key={i} style={tdCell}>
                        <NumInput
                          className="editable-cell"
                          style={inputStyle}
                          ref={(el) => { arrayRefs.current[`${exp.id}-amt-${i}`] = el }}
                          step={1} min={0}
                          defaultValue={v}
                          onBlur={(v2) => handleAmount(exp.id, i, v2)}
                        />
                      </td>
                    ))
                  )}
                  <td style={tdTotal} />
                  <td style={tdSep} />
                  {GROWTH_YEARS.map((_, i) => <td key={i} style={tdCell} />)}
                </tr>

                {/* ── Quantité / mois (ex-saisonnalité, données inchangées) ── */}
                <tr>
                  <td style={tdLabel}>Quantité</td>
                  {uq.enabled ? (
                    <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                      <input
                        type="number"
                        className="editable-cell"
                        style={{ ...inputStyle, width: 100, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                        step={0.5}
                        min={0}
                        max={1}
                        defaultValue={uq.value}
                        key={`${exp.id}-uniform-qty`}
                        onBlur={(e) => handleUniformQty(exp.id, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  ) : (
                    exp.seasonality.map((v, i) => (
                      <td key={i} style={tdCell}>
                        <input
                          type="number"
                          className="editable-cell"
                          style={inputStyle}
                          ref={(el) => { arrayRefs.current[`${exp.id}-seas-${i}`] = el }}
                          step={0.5}
                          min={0}
                          max={1}
                          defaultValue={v}
                          onBlur={(e) => handleSeasonality(exp.id, i, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))
                  )}
                  <td style={tdTotal} />
                  <td style={tdSep} />
                  {exp.inflationGrowth.slice(0, 4).map((r, i) => (
                    <td key={i} style={tdCell}>
                      <input
                        type="number"
                        className="editable-cell"
                        style={{ ...inputStyle, color: 'var(--color-primary)' }}
                        step={0.5}
                        defaultValue={r}
                        ref={(el) => { arrayRefs.current[`${exp.id}-inf-${i}`] = el }}
                        onBlur={(e) => handleInflation(exp.id, i, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                </tr>

                {/* ── Charge mensuelle (calculée) ── */}
                <tr>
                  <td style={{ ...tdLabel, color: 'var(--color-text-muted)', fontWeight: 400 }}>Charge mensuelle (Ar)</td>
                  {exp.monthlyAmounts.map((v, i) => (
                    <td key={i} style={{ ...tdCell, fontSize: 10, color: 'var(--color-text-muted)' }}>
                      {Math.round(v * (exp.seasonality[i] ?? 0)).toLocaleString('fr')}
                    </td>
                  ))}
                  <td style={{ ...tdTotal, background: '#fdf4ff', fontWeight: 700, color: '#7e22ce' }}>
                    {formatAriary(expenseAnnualTotal(exp))}
                  </td>
                  <td style={tdSep} />
                  {GROWTH_YEARS.map((_, i) => <td key={i} style={tdCell} />)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        )
      })}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#16a34a', color: '#fff',
          padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <i className="fas fa-check-circle" /> {toast}
        </div>
      )}
    </div>
  )
}

const thLabel: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', minWidth: 130 }
const thCell: React.CSSProperties  = { textAlign: 'center', padding: '4px 2px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', minWidth: 52 }
const thTotal: React.CSSProperties = { textAlign: 'right', padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--color-text)', minWidth: 100, whiteSpace: 'nowrap' }
const thSep: React.CSSProperties   = { width: 12, background: 'var(--color-border)' }
const tdLabel: React.CSSProperties = { padding: '4px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }
const tdCell: React.CSSProperties  = { padding: '2px 2px', textAlign: 'center' }
const tdTotal: React.CSSProperties = { padding: '4px 8px', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }
const tdSep: React.CSSProperties   = { width: 12, background: 'var(--color-surface-2)' }
const inputStyle: React.CSSProperties = { width: '100%', textAlign: 'right', fontSize: 'var(--text-xs)' }
const addBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }
const saveAllBtn: React.CSSProperties = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '6px 16px', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
const saveAllBtnOk: React.CSSProperties = { ...saveAllBtn, background: '#dcfce7', border: '1px solid #4ade80', color: '#15803d' }
