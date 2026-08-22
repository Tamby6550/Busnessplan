import { useState, useRef } from 'react'
import { offlineStaffApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary, staffAnnualCost, staffAnnualCostByYear } from '@/calculations/calculations'
import NumInput, { parseFormattedNum } from '@/components/ui/NumInput'
import HelpButton from '@/components/ui/HelpButton'

const GROWTH_YEARS = ['An 2', 'An 3', 'An 4', 'An 5']

export default function StaffSection() {
  const company           = useCompanyStore((s) => s.company)!
  const addStaffMember    = useCompanyStore((s) => s.addStaffMember)
  const updateStaffMember = useCompanyStore((s) => s.updateStaffMember)
  const removeStaffMember = useCompanyStore((s) => s.removeStaffMember)

  const [newRole, setNewRole]   = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const arrayRefs  = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleAdd() {
    if (!newRole.trim()) return
    setIsAdding(true)
    try {
      const staff = await offlineStaffApi.create(company.id, { roleName: newRole.trim() })
      addStaffMember(staff)
      setNewRole('')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce poste ?')) return
    await offlineStaffApi.delete(id, company.id)
    removeStaffMember(id)
  }

  // ── Tout est désormais sauvegardé via "Enregistrer tout" — pas d'appel API au blur ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleGrowth(_staffId: number, _idx: number, _val: number) {}

  async function handleSaveAll() {
    setSaving(true)
    try {
      for (const s of useCompanyStore.getState().company?.staffMembers ?? []) {
        const roleName      = arrayRefs.current[`${s.id}-role`]?.value?.trim() || s.roleName
        const monthlySalary = parseFormattedNum(arrayRefs.current[`${s.id}-salary`]?.value || '0') || s.monthlySalary
        const headcount     = parseInt(arrayRefs.current[`${s.id}-headcount`]?.value || '0', 10) || s.headcount
        const chargesRate   = parseFloat(arrayRefs.current[`${s.id}-charges`]?.value || '0') || 0
        const growthRates   = Array.from({ length: 4 }, (_, i) =>
          parseFloat(arrayRefs.current[`${s.id}-growth-${i}`]?.value || '0') || 0,
        )
        const updated = await offlineStaffApi.update(s.id, company.id, { roleName, monthlySalary, headcount, chargesRate, growthRates })
        updateStaffMember(s.id, updated)
      }
      setSaved(true)
      setToast('Modifications enregistrées avec succès !')
      setTimeout(() => { setSaved(false); setToast(null) }, 3000)
    } finally {
      setSaving(false)
    }
  }

  const totalMasseSalariale = company.staffMembers.reduce((sum, s) => sum + staffAnnualCost(s), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>👥 Charges de personnel</h3>
            <p className="section-subtitle">Postes, salaires, effectifs, charges sociales et croissance An 2–5.</p>
          </div>
          <HelpButton
            title="Personnel"
            content={"Enregistrez les postes et salaires de votre équipe.\n\n=> Salaire mensuel brut : Salaire de base par personne par mois.\n\n=> Charges sociales : Taux de cotisations patronales (CNAPS, etc.), généralement 13% à Madagascar.\n\n=> Taux de croissance : Augmentation salariale prévue d'une année à l'autre."}
          />
        </div>
      </div>

      {/* KPI Total masse salariale */}
      {company.staffMembers.length > 0 && (
        <div className="kpi-card" style={{ marginBottom: 'var(--space-5)', background: '#eff6ff', border: '1px solid #93c5fd' }}>
          <div className="kpi-label">Total Masse salariale An 1</div>
          <div className="kpi-value" style={{ color: '#1d4ed8' }}>{formatAriary(totalMasseSalariale)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: '#1d4ed8', marginTop: 4 }}>
            {company.staffMembers.length} poste{company.staffMembers.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Barre ajout + bouton enregistrer unique */}
      <div style={styles.addBar}>
        <input
          className="form-input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="Intitulé du poste…"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={isAdding || !newRole.trim()}>
          {isAdding ? '…' : '+ Ajouter un poste'}
        </button>
        {company.staffMembers.length > 0 && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            style={saved ? styles.saveOk : styles.save}
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

      {company.staffMembers.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">Aucun poste</div>
          <p className="empty-state-desc">Ajoutez vos postes salariaux ci-dessus.</p>
        </div>
      )}

      {company.staffMembers.length > 0 && (
        <div className="card">
          <div className="table-wrapper">
            <table style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Poste / Fonction</th>
                  <th style={{ textAlign: 'right', minWidth: 130 }}>Salaire/mois (Ar)</th>
                  <th style={{ textAlign: 'right', minWidth: 70 }}>Effectif</th>
                  <th style={{ textAlign: 'right', minWidth: 80 }}>Charges (%)</th>
                  <th style={{ textAlign: 'right', minWidth: 110 }}>Coût An 1</th>
                  <th style={{ width: 14, background: 'var(--color-border)', padding: 0 }} />
                  {GROWTH_YEARS.map((y) => (
                    <th key={y} style={{ textAlign: 'center', minWidth: 65, color: 'var(--color-primary)', fontWeight: 700 }}>
                      {y} %
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {company.staffMembers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        className="editable-cell"
                        style={{ width: '100%', minWidth: 160 }}
                        defaultValue={s.roleName}
                        ref={(el) => { arrayRefs.current[`${s.id}-role`] = el }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <NumInput
                        className="editable-cell"
                        style={{ width: 120, textAlign: 'right' }}
                        defaultValue={s.monthlySalary}
                        min={0}
                        ref={(el) => { arrayRefs.current[`${s.id}-salary`] = el }}
                        onBlur={() => {}}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        className="editable-cell"
                        style={{ width: 60, textAlign: 'right' }}
                        defaultValue={s.headcount}
                        min={1}
                        ref={(el) => { arrayRefs.current[`${s.id}-headcount`] = el }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        className="editable-cell"
                        style={{ width: 70, textAlign: 'right' }}
                        step="0.5"
                        defaultValue={s.chargesRate}
                        min={0}
                        ref={(el) => { arrayRefs.current[`${s.id}-charges`] = el }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatAriary(staffAnnualCost(s))}
                    </td>
                    <td style={{ width: 14, background: 'var(--color-border)', padding: 0 }} />
                    {(s.growthRates ?? [0, 0, 0, 0]).slice(0, 4).map((r, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '3px 2px' }}>
                        <input
                          type="number"
                          className="editable-cell"
                          style={{ width: 58, textAlign: 'right', color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}
                          step="0.5"
                          ref={(el) => { arrayRefs.current[`${s.id}-growth-${i}`] = el }}
                          defaultValue={r}
                          onBlur={(e) => handleGrowth(s.id, i, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '4px 2px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 16 }}
                        onClick={() => handleDelete(s.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ fontWeight: 600 }}>Total masse salariale An 1</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAriary(totalMasseSalariale)}</td>
                  <td style={{ width: 14, background: 'var(--color-border)', padding: 0 }} />
                  {[1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>
                      {formatAriary(company.staffMembers.reduce((sum, s) => sum + staffAnnualCostByYear(s, yearIdx), 0))}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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

const styles: Record<string, React.CSSProperties> = {
  addBar: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
  },
  save: {
    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6,
    padding: '6px 16px', color: '#16a34a', cursor: 'pointer', fontSize: 13,
    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
  },
  saveOk: {
    background: '#dcfce7', border: '1px solid #4ade80', borderRadius: 6,
    padding: '6px 16px', color: '#15803d', cursor: 'pointer', fontSize: 13,
    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
  },
}
