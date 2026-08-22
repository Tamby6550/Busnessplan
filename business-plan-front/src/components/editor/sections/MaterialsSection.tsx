import { useState, useRef } from 'react'
import { offlineMaterialApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary } from '@/calculations/calculations'
import type { Material } from '@/types'
import HelpButton from '@/components/ui/HelpButton'
import NumInput, { parseFormattedNum } from '@/components/ui/NumInput'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const GROWTH_YEARS = ['An 2','An 3','An 4','An 5']

function allSame(values: number[]): boolean {
  return values.length > 0 && values.every((v) => v === values[0])
}

interface UniformState { enabled: boolean; value: number }

function initUniformFor(materials: Material[], field: 'monthlyQty' | 'monthlyUnitCost'): Record<number, UniformState> {
  const map: Record<number, UniformState> = {}
  materials.forEach((m) => {
    const arr = m[field]
    map[m.id] = { enabled: allSame(arr), value: arr[0] ?? 0 }
  })
  return map
}

export default function MaterialsSection() {
  const company         = useCompanyStore((s) => s.company)!
  const addMaterial     = useCompanyStore((s) => s.addMaterial)
  const updateMaterial  = useCompanyStore((s) => s.updateMaterial)
  const removeMaterial  = useCompanyStore((s) => s.removeMaterial)

  const [newName, setNewName]   = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const arrayRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [uniformQty, setUniformQty] = useState<Record<number, UniformState>>(() =>
    initUniformFor(company.materials, 'monthlyQty')
  )
  const [uniformCost, setUniformCost] = useState<Record<number, UniformState>>(() =>
    initUniformFor(company.materials, 'monthlyUnitCost')
  )


  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const mat = await offlineMaterialApi.create(company.id, { name: newName.trim() })
      addMaterial(mat)
      setUniformQty((prev) => ({ ...prev, [mat.id]: { enabled: true, value: 0 } }))
      setUniformCost((prev) => ({ ...prev, [mat.id]: { enabled: true, value: 0 } }))
      setNewName('')
    } finally { setIsAdding(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette matiere ?')) return
    await offlineMaterialApi.delete(id, company.id)
    removeMaterial(id)
  }

  // ── Tout est désormais sauvegardé via "Enregistrer tout" — pas d'appel API au blur ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleQty(_matId: number, _idx: number, _val: number) {}

  function handleUniformQty(matId: number, val: number) {
    setUniformQty((prev) => ({ ...prev, [matId]: { enabled: true, value: val } }))
  }

  function toggleQtyMode(mat: Material) {
    setUniformQty((prev) => {
      const cur = prev[mat.id] ?? { enabled: false, value: 0 }
      return { ...prev, [mat.id]: { enabled: !cur.enabled, value: mat.monthlyQty[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleCost(_matId: number, _idx: number, _val: number) {}

  function handleUniformCost(matId: number, val: number) {
    setUniformCost((prev) => ({ ...prev, [matId]: { enabled: true, value: val } }))
  }

  function toggleCostMode(mat: Material) {
    setUniformCost((prev) => {
      const cur = prev[mat.id] ?? { enabled: false, value: 0 }
      return { ...prev, [mat.id]: { enabled: !cur.enabled, value: mat.monthlyUnitCost[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleGrowth(_matId: number, _idx: number, _val: number) {}

  async function handleSaveAll() {
    setSaving(true)
    try {
      for (const mat of useCompanyStore.getState().company?.materials ?? []) {
        const name = arrayRefs.current[`${mat.id}-name`]?.value?.trim() || mat.name
        const uq = uniformQty[mat.id]
        const monthlyQty = uq?.enabled
          ? Array(12).fill(uq.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFormattedNum(arrayRefs.current[`${mat.id}-qty-${i}`]?.value || '0')
            )
        const uc = uniformCost[mat.id]
        const monthlyUnitCost = uc?.enabled
          ? Array(12).fill(uc.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFormattedNum(arrayRefs.current[`${mat.id}-cost-${i}`]?.value || '0')
            )
        const growthRates = [
          ...Array.from({ length: 4 }, (_, i) =>
            parseFloat(arrayRefs.current[`${mat.id}-growth-${i}`]?.value || '0') || 0,
          ),
          mat.growthRates[4] ?? 0,
        ]
        const updated = await offlineMaterialApi.update(mat.id, company.id, { name, monthlyQty, monthlyUnitCost, growthRates })
        updateMaterial(mat.id, updated)
      }
      setSaved(true)
      setToast('Modifications enregistrées avec succès !')
      setTimeout(() => { setSaved(false); setToast(null) }, 3000)
    } finally { setSaving(false) }
  }

  const totalQty     = (m: Material) => m.monthlyQty.reduce((a, b) => a + b, 0)
  const totalCost    = (m: Material) => m.monthlyQty.reduce((sum, qty, i) => sum + qty * (m.monthlyUnitCost[i] ?? 0), 0)
  const grandTotalCost = company.materials.reduce((s, m) => s + totalCost(m), 0)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            <i className="fas fa-boxes-stacked" style={{ marginRight: 8, color: 'var(--color-primary)' }} />
            Matières premières
          </h3>
          <p className="section-subtitle">Coût unitaire mensuel, quantités mensuelles et taux de croissance An 2-5.</p>
        </div>
        <HelpButton
          title="Matières premières"
          content={"Saisissez vos matieres premieres ou consommables, mois par mois.\n\n=> Cout mensuel : Le cout d'achat peut varier selon la saison. Mode uniforme = meme cout toute l'annee, mode detaille = un cout different par mois.\n\n=> Mode uniforme (quantite) : Si la quantite est la meme tous les mois, saisissez-la une seule fois.\n\n=> Mode individuel (quantite) : Saisissez une quantite differente pour chaque mois (decimales autorisees).\n\n=> Taux de croissance : Evolution de la quantite sur 5 ans ; le profil de cout mensuel se repete a l'identique chaque annee."}
        />
      </div>

      {/* KPI Total Coût variable */}
      {company.materials.length > 0 && (
        <div className="kpi-card" style={{ marginBottom: 'var(--space-5)', background: '#fef9c3', border: '1px solid #fbbf24' }}>
          <div className="kpi-label">Total Coût variable An 1</div>
          <div className="kpi-value" style={{ color: '#92400e' }}>{formatAriary(grandTotalCost)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: '#92400e', marginTop: 4 }}>
            {company.materials.length} matière{company.materials.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Barre ajout + enregistrer */}
      <div style={addBarStyle}>
        <input
          className="form-input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="Nom de la matiere..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={isAdding || !newName.trim()}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          {isAdding ? 'Ajout...' : 'Ajouter'}
        </button>
        {company.materials.length > 0 && (
          <button type="button" onClick={handleSaveAll} disabled={saving}
            style={saved ? saveAllBtnOk : saveAllBtn}>
            {saving
              ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Enregistrement...</>
              : saved
              ? <><i className="fas fa-check-circle" style={{ marginRight: 6 }} />Enregistré !</>
              : <><i className="fas fa-floppy-disk" style={{ marginRight: 6 }} />Enregistrer tout</>
            }
          </button>
        )}
      </div>

      {company.materials.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-boxes-stacked" /></div>
          <div className="empty-state-title">Aucune matiere premiere</div>
          <p className="empty-state-desc">Ajoutez vos matieres ou intrants ci-dessus.</p>
        </div>
      )}

      {company.materials.map((mat) => {
        const uq = uniformQty[mat.id]   ?? { enabled: false, value: 0 }
        const uc = uniformCost[mat.id]  ?? { enabled: false, value: 0 }

        return (
          <div key={mat.id} className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  style={{ fontWeight: 600, maxWidth: 240 }}
                  defaultValue={mat.name}
                  ref={(el) => { arrayRefs.current[`${mat.id}-name`] = el }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="kpi-card" style={{ padding: '4px 12px' }}>
                  <div className="kpi-label">Coût An 1</div>
                  <div className="kpi-value" style={{ fontSize: 'var(--text-base)' }}>{formatAriary(totalCost(mat))}</div>
                </div>
                <button onClick={() => handleDelete(mat.id)} title="Supprimer cette matiere"
                  style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '7px 12px', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>x</span>
                </button>
              </div>
            </div>

            <div className="card-body" style={{ overflowX: 'auto' }}>

              {/* Toggles mode uniforme : coût et quantité, indépendants */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Coût différent par mois</span>
                  <div
                    onClick={() => toggleCostMode(mat)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                      background: uc.enabled ? 'var(--color-primary)' : '#d1d5db',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: uc.enabled ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: uc.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: uc.enabled ? 700 : 400 }}>
                    Même coût toute l'année
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quantité différente par mois</span>
                  <div
                    onClick={() => toggleQtyMode(mat)}
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
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={thLabel}>Libellé</th>
                    {MONTHS.map((m) => <th key={m} style={thCell}>{m}</th>)}
                    <th style={thTotal}>Total An 1</th>
                    <th style={thSep} />
                    {GROWTH_YEARS.map((y) => (
                      <th key={y} style={{ ...thCell, color: 'var(--color-primary)', fontWeight: 700 }}>{y} %</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ── Coût unitaire / mois ── */}
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <td style={tdLabel}>Coût unitaire / mois</td>
                    {uc.enabled ? (
                      <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                        <NumInput
                          className="editable-cell"
                          style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                          step={1} min={0}
                          defaultValue={uc.value}
                          key={`${mat.id}-uniform-cost`}
                          onBlur={(v) => handleUniformCost(mat.id, v)}
                        />
                      </td>
                    ) : (
                      mat.monthlyUnitCost.map((v, i) => (
                        <td key={i} style={tdCell}>
                          <NumInput
                            className="editable-cell"
                            style={inputStyle}
                            ref={(el) => { arrayRefs.current[`${mat.id}-cost-${i}`] = el }}
                            step={1} min={0}
                            defaultValue={v}
                            onBlur={(v2) => handleCost(mat.id, i, v2)}
                          />
                        </td>
                      ))
                    )}
                    <td style={tdTotal} />
                    <td style={tdSep} />
                    {GROWTH_YEARS.map((_, i) => <td key={i} style={tdCell} />)}
                  </tr>

                  {/* ── Quantité / mois ── */}
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <td style={tdLabel}>Quantité / mois</td>
                    {uq.enabled ? (
                      <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                        <NumInput
                          className="editable-cell"
                          style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                          step={0.01} min={0}
                          defaultValue={uq.value}
                          key={`${mat.id}-uniform-qty`}
                          onBlur={(v) => handleUniformQty(mat.id, v)}
                        />
                      </td>
                    ) : (
                      mat.monthlyQty.map((v, i) => (
                        <td key={i} style={tdCell}>
                          <NumInput
                            className="editable-cell"
                            style={inputStyle}
                            ref={(el) => { arrayRefs.current[`${mat.id}-qty-${i}`] = el }}
                            step={0.01} min={0}
                            defaultValue={v}
                            onBlur={(v2) => handleQty(mat.id, i, v2)}
                          />
                        </td>
                      ))
                    )}
                    <td style={{ ...tdTotal, fontWeight: 700 }}>
                      {totalQty(mat).toLocaleString('fr')}
                    </td>
                    <td style={tdSep} />
                    {mat.growthRates.slice(0, 4).map((r, i) => (
                      <td key={i} style={tdCell}>
                        <input
                          type="number"
                          className="editable-cell"
                          ref={(el) => { arrayRefs.current[`${mat.id}-growth-${i}`] = el }}
                          style={{ ...inputStyle, color: 'var(--color-primary)', fontWeight: 600 }}
                          step={0.5}
                          defaultValue={r}
                          onBlur={(e) => handleGrowth(mat.id, i, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* ── Coût mensuel (calculé) ── */}
                  <tr>
                    <td style={{ ...tdLabel, color: 'var(--color-text-muted)', fontWeight: 400 }}>Coût mensuel (Ar)</td>
                    {mat.monthlyQty.map((v, i) => (
                      <td key={i} style={{ ...tdCell, fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {(v * (mat.monthlyUnitCost[i] ?? 0)).toLocaleString('fr')}
                      </td>
                    ))}
                    <td style={{ ...tdTotal, background: '#fef9c3', fontWeight: 700, color: '#92400e' }}>
                      {formatAriary(totalCost(mat))}
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

const thLabel: React.CSSProperties  = { textAlign: 'left',   padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', minWidth: 140, background: '#f8fafc' }
const thCell: React.CSSProperties   = { textAlign: 'center', padding: '6px 2px',  fontSize: 10, fontWeight: 700, color: '#374151', minWidth: 52, background: '#f8fafc' }
const thTotal: React.CSSProperties  = { textAlign: 'right',  padding: '6px 10px', fontSize: 10, fontWeight: 700, color: '#1a1a1a', minWidth: 100, background: '#eaf5e6', whiteSpace: 'nowrap' }
const thSep: React.CSSProperties    = { width: 14, background: '#e2e8f0' }
const tdLabel: React.CSSProperties  = { padding: '5px 10px', fontSize: 'var(--text-xs)', fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap' }
const tdCell: React.CSSProperties   = { padding: '3px 2px',  textAlign: 'center' }
const tdTotal: React.CSSProperties  = { padding: '5px 10px', textAlign: 'right', fontSize: 'var(--text-sm)', color: '#1a1a1a', background: '#f0fdf4' }
const tdSep: React.CSSProperties    = { width: 14, background: '#e2e8f0' }
const inputStyle: React.CSSProperties = { width: '100%', textAlign: 'right', fontSize: 'var(--text-xs)' }
const addBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }
const saveAllBtn: React.CSSProperties = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '6px 16px', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
const saveAllBtnOk: React.CSSProperties = { ...saveAllBtn, background: '#dcfce7', border: '1px solid #4ade80', color: '#15803d' }
