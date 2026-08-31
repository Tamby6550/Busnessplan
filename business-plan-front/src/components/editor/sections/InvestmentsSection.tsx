import { useState, useEffect, useRef } from 'react'
import { offlineInvestmentApi, offlineInvestmentTerrainApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary, buildDepreciationTable } from '@/calculations/calculations'
import type { Investment } from '@/types'
import NumInput, { parseFormattedNum } from '@/components/ui/NumInput'
import HelpButton from '@/components/ui/HelpButton'


interface PctRow { equity: number; grant: number; loan: number }

/** Arrondi à 1 décimale pour éviter 67.5 → 68 → 101% total */
const round1 = (n: number) => Math.round(n * 10) / 10

function initPct(inv: Investment): PctRow {
  if (inv.amount <= 0) return { equity: 100, grant: 0, loan: 0 }
  return {
    equity: round1((inv.financedEquity / inv.amount) * 100),
    grant:  round1((inv.financedGrant  / inv.amount) * 100),
    loan:   round1((inv.financedLoan   / inv.amount) * 100),
  }
}

export default function InvestmentsSection() {
  const company          = useCompanyStore((s) => s.company)!
  const addInvestment    = useCompanyStore((s) => s.addInvestment)
  const updateInvestment = useCompanyStore((s) => s.updateInvestment)
  const removeInvestment = useCompanyStore((s) => s.removeInvestment)

  const addInvestmentTerrain    = useCompanyStore((s) => s.addInvestmentTerrain)
  const updateInvestmentTerrain = useCompanyStore((s) => s.updateInvestmentTerrain)
  const removeInvestmentTerrain = useCompanyStore((s) => s.removeInvestmentTerrain)

  const [newName, setNewName]   = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [inputMode, setInputMode] = useState<'pct' | 'amount'>('pct')

  const [newTerrainName, setNewTerrainName] = useState('')
  const [isAddingTerrain, setIsAddingTerrain] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const arrayRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})

  const [pcts, setPcts] = useState<Record<number, PctRow>>(() => {
    const map: Record<number, PctRow> = {}
    company.investments.forEach((inv) => { map[inv.id] = initPct(inv) })
    return map
  })

  const [contribTypes, setContribTypes] = useState<Record<number, 'nature' | 'financier'>>(() => {
    const map: Record<number, 'nature' | 'financier'> = {}
    company.investments.forEach((inv) => { map[inv.id] = inv.contributionType })
    return map
  })

  const [amounts, setAmounts] = useState<Record<number, { equity: number; grant: number; loan: number }>>(() => {
    const map: Record<number, { equity: number; grant: number; loan: number }> = {}
    company.investments.forEach((inv) => {
      map[inv.id] = { equity: inv.financedEquity, grant: inv.financedGrant, loan: inv.financedLoan }
    })
    return map
  })

  useEffect(() => {
    setPcts((prev) => {
      const next = { ...prev }
      company.investments.forEach((inv) => {
        if (!next[inv.id]) next[inv.id] = initPct(inv)
      })
      return next
    })
    setAmounts((prev) => {
      const next = { ...prev }
      company.investments.forEach((inv) => {
        if (!next[inv.id]) next[inv.id] = { equity: inv.financedEquity, grant: inv.financedGrant, loan: inv.financedLoan }
      })
      return next
    })
    setContribTypes((prev) => {
      const next = { ...prev }
      company.investments.forEach((inv) => {
        if (!next[inv.id]) next[inv.id] = inv.contributionType
      })
      return next
    })
  }, [company.investments])

  function handleContributionType(inv: Investment, value: 'nature' | 'financier') {
    setContribTypes((prev) => ({ ...prev, [inv.id]: value }))
    if (value === 'nature') {
      setPcts((prev) => ({ ...prev, [inv.id]: { equity: 100, grant: 0, loan: 0 } }))
      setAmounts((prev) => ({ ...prev, [inv.id]: { equity: inv.amount, grant: 0, loan: 0 } }))
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const inv = await offlineInvestmentApi.create(company.id, { name: newName.trim() })
      addInvestment(inv)
      setPcts((prev) => ({ ...prev, [inv.id]: { equity: 100, grant: 0, loan: 0 } }))
      setNewName('')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet investissement ?')) return
    await offlineInvestmentApi.delete(id, company.id)
    removeInvestment(id)
  }

  // ── Tout est désormais sauvegardé via "Enregistrer tout" — pas d'appel API au blur ──

  // Montant total change → recalcule les montants financés en mode Ar pour handleSaveAll
  function handleAmount(inv: Investment, newAmount: number) {
    const p = pcts[inv.id] ?? { equity: 100, grant: 0, loan: 0 }
    const equity = Math.round(newAmount * p.equity / 100)
    const grant  = Math.round(newAmount * p.grant  / 100)
    const loan   = newAmount - equity - grant
    setAmounts((prev) => ({ ...prev, [inv.id]: { equity, grant, loan } }))
  }

  // Saisie % → met à jour le state local uniquement
  function handlePct(inv: Investment, field: 'equity' | 'grant' | 'loan', newPct: number) {
    const p = { ...(pcts[inv.id] ?? { equity: 0, grant: 0, loan: 0 }), [field]: newPct }
    setPcts((prev) => ({ ...prev, [inv.id]: p }))
  }

  // Saisie montant → met à jour pcts + amounts state uniquement
  function handleFinancedAmount(inv: Investment, field: 'equity' | 'grant' | 'loan', newMontant: number) {
    const newPct = inv.amount > 0 ? round1((newMontant / inv.amount) * 100) : 0
    setPcts((prev) => ({ ...prev, [inv.id]: { ...(prev[inv.id] ?? { equity: 0, grant: 0, loan: 0 }), [field]: newPct } }))
    setAmounts((prev) => ({ ...prev, [inv.id]: { ...(prev[inv.id] ?? { equity: 0, grant: 0, loan: 0 }), [field]: newMontant } }))
  }

  // ── Investissement Terrain : juste désignation + montant, sans durée
  // d'amortissement ni plan de financement (aucun lien avec la trésorerie) ──
  async function handleAddTerrain() {
    if (!newTerrainName.trim()) return
    setIsAddingTerrain(true)
    try {
      const inv = await offlineInvestmentTerrainApi.create(company.id, { name: newTerrainName.trim() })
      addInvestmentTerrain(inv)
      setNewTerrainName('')
    } finally {
      setIsAddingTerrain(false)
    }
  }

  async function handleDeleteTerrain(id: number) {
    if (!confirm('Supprimer cet investissement terrain ?')) return
    await offlineInvestmentTerrainApi.delete(id, company.id)
    removeInvestmentTerrain(id)
  }


  async function handleSaveConfirm() {
    setIsSaving(true)
    try {
      // Investissements amortissables
      for (const inv of useCompanyStore.getState().company?.investments ?? []) {
        const name      = arrayRefs.current[`${inv.id}-name`]?.value?.trim() || inv.name
        const amount    = parseFormattedNum(arrayRefs.current[`${inv.id}-amount`]?.value || '0') || inv.amount
        const usefulLife = parseInt(arrayRefs.current[`${inv.id}-life`]?.value || '', 10) || inv.usefulLife
        const equipmentType = (arrayRefs.current[`${inv.id}-equipmentType`]?.value as 'electrique' | 'non_electrique' | '' | undefined)
        const contributionType = contribTypes[inv.id] ?? inv.contributionType
        const loanRate  = parseFloat(arrayRefs.current[`${inv.id}-rate`]?.value || '') || 0
        const loanYears = parseInt(arrayRefs.current[`${inv.id}-years`]?.value || '', 10) || inv.loanYears

        const p = pcts[inv.id] ?? { equity: 100, grant: 0, loan: 0 }
        const a = amounts[inv.id] ?? { equity: inv.financedEquity, grant: inv.financedGrant, loan: inv.financedLoan }
        let financedEquity: number, financedGrant: number, financedLoan: number
        if (contributionType === 'nature') {
          financedEquity = amount
          financedGrant  = 0
          financedLoan   = 0
        } else if (inputMode === 'amount') {
          financedEquity = a.equity
          financedGrant  = a.grant
          financedLoan   = a.loan
        } else {
          financedEquity = Math.round(amount * p.equity / 100)
          financedGrant  = Math.round(amount * p.grant  / 100)
          financedLoan   = amount - financedEquity - financedGrant
        }
        const updated = await offlineInvestmentApi.update(inv.id, company.id, {
          name, amount, usefulLife, equipmentType: equipmentType || null, contributionType, loanRate, loanYears,
          financedEquity, financedGrant, financedLoan,
        })
        updateInvestment(inv.id, updated)
      }
      // Investissements non amortissables (terrains)
      for (const terr of useCompanyStore.getState().company?.investmentTerrains ?? []) {
        const name   = arrayRefs.current[`t${terr.id}-name`]?.value?.trim() || terr.name
        const amount = parseFormattedNum(arrayRefs.current[`t${terr.id}-amount`]?.value || '0')
        const natureType = (arrayRefs.current[`t${terr.id}-nature`]?.value as 'immateriel' | 'physique' | undefined) || terr.natureType
        const updated = await offlineInvestmentTerrainApi.update(terr.id, company.id, { name, amount, natureType })
        updateInvestmentTerrain(terr.id, updated)
      }
      setSaved(true)
      setToast('Modifications enregistrées avec succès !')
      setTimeout(() => { setSaved(false); setToast(null) }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const totalInvest   = company.investments.reduce((s, i) => s + i.amount, 0)
  const totalEquity   = company.investments.reduce((s, i) => s + i.financedEquity, 0)
  const totalLoan     = company.investments.reduce((s, i) => s + i.financedLoan, 0)
  const totalGrant    = company.investments.reduce((s, i) => s + i.financedGrant, 0)
  const totalFinanced = totalEquity + totalLoan + totalGrant

  const pctOf = (val: number) => totalInvest > 0 ? Math.round((val / totalInvest) * 100) : 0

  // Total Investissement Terrain — indépendant du tableau général (pas mêlé au calcul)
  const totalInvestTerrain = company.investmentTerrains.reduce((s, i) => s + i.amount, 0)

  // En mode %, vérifie que les 3 % somment à 100
  // En mode Ar, vérifie que equity+grant+loan = amount (tolérance ±1 Ar pour les arrondis)
  function isRowOk(inv: Investment): boolean {
    if (inputMode === 'amount') {
      const sum = inv.financedEquity + inv.financedGrant + inv.financedLoan
      return Math.abs(sum - inv.amount) <= 1
    }
    const p = pcts[inv.id] ?? { equity: 0, grant: 0, loan: 0 }
    return Math.abs(p.equity + p.grant + p.loan - 100) < 0.1
  }

  function rowDisplaySum(inv: Investment): string {
    if (inputMode === 'amount') {
      const sum = inv.financedEquity + inv.financedGrant + inv.financedLoan
      return inv.amount > 0
        ? `${Math.round((sum / inv.amount) * 100)} %`
        : '0 %'
    }
    const p = pcts[inv.id] ?? { equity: 0, grant: 0, loan: 0 }
    return `${round1(p.equity + p.grant + p.loan)} %`
  }

  const errorRows = company.investments.filter((inv) => !isRowOk(inv))
  const hasErrors = errorRows.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>
              <i className="fas fa-building" style={{ marginRight: 8, color: '#3b82f6' }} />
              Investissements & Financement
            </h3>
            <p className="section-subtitle">Immobilisations, durée d'amortissement et plan de financement.</p>
          </div>
          <HelpButton
            title="Investissements & Financement"
            content={"Déclarez vos immobilisations et leur plan de financement.\n\n=> Montant : Coût total de l'investissement.\n\n=> Mode % : Saisissez le pourcentage, le montant est calculé automatiquement.\n=> Mode Ar : Saisissez le montant directement, le % est calculé automatiquement.\n\n=> La somme des 3 pourcentages doit être égale à 100 %.\n\n=> Taux et durée d'emprunt : S'appliquent uniquement à la part financée par emprunt."}
          />
        </div>
      </div>

      {/* Alerte % ≠ 100 */}
      {hasErrors && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 'var(--space-4)', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
          <i className="fas fa-triangle-exclamation" style={{ color: '#dc2626', fontSize: 18, marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
              La somme des pourcentages doit être 100 % - {errorRows.length} investissement{errorRows.length > 1 ? 's' : ''}
            </div>
            <div style={{ color: '#7f1d1d', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
              {errorRows.map((inv) => {
                const display = rowDisplaySum(inv)
                const numVal  = inputMode === 'amount'
                  ? inv.financedEquity + inv.financedGrant + inv.financedLoan
                  : (pcts[inv.id]?.equity ?? 0) + (pcts[inv.id]?.grant ?? 0) + (pcts[inv.id]?.loan ?? 0)
                const ref = inputMode === 'amount' ? inv.amount : 100
                const diff = numVal - ref
                return (
                  <div key={inv.id}>
                    • <strong>{inv.name}</strong> : total = <strong>{display}</strong>
                    {diff > 0
                      ? ` (${inputMode === 'amount' ? `+${diff} Ar en trop` : `+${diff} % en trop`})`
                      : ` (${inputMode === 'amount' ? `${Math.abs(diff)} Ar manquant` : `${Math.abs(diff)} % manquant`})`}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI Fonds propres total — somme Total investissement + Total investissement Terrain */}
      {(company.investments.length > 0 || company.investmentTerrains.length > 0) && (
        <div className="kpi-card" style={{ marginBottom: 'var(--space-5)', background: '#FBE4D3', border: '1px solid #8B4513' }}>
          <div className="kpi-label">Fonds propres total</div>
          <div className="kpi-value" style={{ color: '#8B4513' }}>{formatAriary(totalEquity + totalInvestTerrain)}</div>
        </div>
      )}

      {/* KPIs — avec % du total */}
      {(company.investments.length > 0 || company.investmentTerrains.length > 0) && (
        <div className="kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {company.investmentTerrains.length > 0 && (
            <div className="kpi-card">
              <div className="kpi-label">Total investissement non amorti</div>
              <div className="kpi-value">{formatAriary(totalInvestTerrain)}</div>
            </div>
          )}
          <div className="kpi-card">
            <div className="kpi-label">Total investissement amorti</div>
            <div className="kpi-value">{formatAriary(totalInvest)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Subventions</div>
            <div className="kpi-value">{formatAriary(totalGrant)}</div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
              {pctOf(totalGrant)} % du total
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Emprunts</div>
            <div className="kpi-value">{formatAriary(totalLoan)}</div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
              {pctOf(totalLoan)} % du total
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total fonds propres amorti</div>
            <div className="kpi-value">{formatAriary(totalEquity)}</div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
              {pctOf(totalEquity)} % du total
            </div>
          </div>
          <div className="kpi-card" style={{ border: `1px solid ${hasErrors ? '#fca5a5' : '#86efac'}`, background: hasErrors ? '#fef2f2' : '#f0fdf4' }}>
            <div className="kpi-label">Total financé</div>
            <div className="kpi-value" style={{ color: hasErrors ? '#dc2626' : '#16a34a' }}>
              {formatAriary(totalFinanced)}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: 4, color: hasErrors ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
              {hasErrors ? 'Vérifiez les %' : '✓ Équilibré'}
            </div>
          </div>
          
        </div>
      )}

      <h4 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
        Investissement non amortissables
      </h4>
      <div style={styles.addBar}>
        <input className="form-input" style={{ flex: 1, maxWidth: 320 }}
          placeholder="Nom de l'investissement non amorti ..." value={newTerrainName}
          onChange={(e) => setNewTerrainName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTerrain()} />
        <button className="btn btn-primary" onClick={handleAddTerrain} disabled={isAddingTerrain || !newTerrainName.trim()}>
          {isAddingTerrain ? '…' : '+ Ajouter'}
        </button>
        <button type="button" onClick={handleSaveConfirm} disabled={isSaving}
          style={saved ? saveAllBtnOk : saveAllBtn}>
          {isSaving
            ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Enregistrement...</>
            : saved
            ? <><i className="fas fa-check-circle" style={{ marginRight: 6 }} />Enregistré !</>
            : <><i className="fas fa-floppy-disk" style={{ marginRight: 6 }} />Enregistrer tout</>
          }
        </button>
      </div>

      {company.investmentTerrains.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Désignation (Terrain)</th>
                  <th style={{ textAlign: 'center' }}>Nature</th>
                  <th style={{ textAlign: 'right' }}>Montant (Ar)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {company.investmentTerrains.map((inv) => (
                  <tr key={inv.id}>

                    {/* Désignation */}
                    <td>
                      <input className="editable-cell" style={{ width: '100%', minWidth: 160 }}
                        defaultValue={inv.name}
                        ref={(el) => { arrayRefs.current[`t${inv.id}-name`] = el }} />
                    </td>

                    {/* Nature : immatériel / physique */}
                    <td style={{ textAlign: 'center' }}>
                      <select className="editable-cell" style={{ width: 110 }}
                        defaultValue={inv.natureType ?? 'physique'}
                        ref={(el) => { arrayRefs.current[`t${inv.id}-nature`] = el }}>
                        <option value="physique">Physique</option>
                        <option value="immateriel">Immatériel</option>
                      </select>
                    </td>

                    {/* Montant */}
                    <td style={{ textAlign: 'right' }}>
                      <NumInput className="editable-cell" style={{ width: 120, textAlign: 'right' }}
                        defaultValue={inv.amount} min={0}
                        ref={(el) => { arrayRefs.current[`t${inv.id}-amount`] = el }}
                        onBlur={() => {}} />
                    </td>

                    <td>
                      <button className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 16 }}
                        onClick={() => handleDeleteTerrain(inv.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 600 }}>Total</td>
                  <td />
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAriary(totalInvestTerrain)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Barre d'ajout + toggle mode saisie */}
      <h4 style={{ margin: 'var(--space-6) 0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
        Investissement amortissables
      </h4>
      <div style={{ ...styles.addBar, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input className="form-input" style={{ flex: 1, maxWidth: 320 }}
            placeholder="Nom de l'investissement amorti …" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button className="btn btn-primary" onClick={handleAdd} disabled={isAdding || !newName.trim()}>
            {isAdding ? '…' : '+ Ajouter'}
          </button>
        </div>

        {/* Toggle % / Ar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Mode de saisie :</span>
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setInputMode('pct')}
              style={{
                padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: inputMode === 'pct' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: inputMode === 'pct' ? '#fff' : 'var(--color-text-muted)',
                transition: 'background 0.15s',
              }}
            >
              %
            </button>
            <button
              onClick={() => setInputMode('amount')}
              style={{
                padding: '5px 14px', border: 'none', borderLeft: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: inputMode === 'amount' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: inputMode === 'amount' ? '#fff' : 'var(--color-text-muted)',
                transition: 'background 0.15s',
              }}
            >
              Ar
            </button>
          </div>
        </div>
      </div>

      {company.investments.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏗</div>
          <div className="empty-state-title">Aucun investissement</div>
        </div>
      )}


      {company.investments.length > 0 && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th style={{ textAlign: 'right' }}>Montant (Ar)</th>
                  <th style={{ textAlign: 'right' }}>Durée amort.</th>
                  <th style={{ textAlign: 'center' }}>Type d'équipement</th>
                  <th style={{ textAlign: 'center' }}>Type d'apport</th>
                  <th style={{ textAlign: 'right' }}>
                    Fonds propres
                    <span style={styles.modeTag}>{inputMode === 'pct' ? '%' : 'Ar'}</span>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    Subvention
                    <span style={styles.modeTag}>{inputMode === 'pct' ? '%' : 'Ar'}</span>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    Emprunt
                    <span style={styles.modeTag}>{inputMode === 'pct' ? '%' : 'Ar'}</span>
                  </th>
                  <th style={{ textAlign: 'right' }}>Taux empr. %</th>
                  <th style={{ textAlign: 'right' }}>Durée empr.</th>
                  <th style={{ textAlign: 'center', minWidth: 80 }}>Total %</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {company.investments.map((inv) => {
                  const p    = pcts[inv.id] ?? { equity: 0, grant: 0, loan: 0 }
                  const ok   = isRowOk(inv)

                  return (
                    <tr key={inv.id} style={{ background: !ok ? '#fff5f5' : undefined }}>

                      {/* Désignation */}
                      <td>
                        <input className="editable-cell" style={{ width: '100%', minWidth: 160 }}
                          defaultValue={inv.name}
                          ref={(el) => { arrayRefs.current[`${inv.id}-name`] = el }} />
                      </td>

                      {/* Montant total */}
                      <td style={{ textAlign: 'right' }}>
                        <NumInput className="editable-cell" style={{ width: 120, textAlign: 'right' }}
                          defaultValue={inv.amount} min={0}
                          ref={(el) => { arrayRefs.current[`${inv.id}-amount`] = el }}
                          onBlur={(v) => handleAmount(inv, v)} />
                      </td>

                      {/* Durée amortissement */}
                      <td style={{ textAlign: 'right' }}>
                        <input type="number" className="editable-cell" style={{ width: 60, textAlign: 'right' }}
                          defaultValue={inv.usefulLife} min={1}
                          ref={(el) => { arrayRefs.current[`${inv.id}-life`] = el }} />
                      </td>

                      {/* Type d'équipement */}
                      <td style={{ textAlign: 'center' }}>
                        <select className="editable-cell" style={{ width: 130 }}
                          defaultValue={inv.equipmentType ?? ''}
                          ref={(el) => { arrayRefs.current[`${inv.id}-equipmentType`] = el }}>
                          <option value="">—</option>
                          <option value="electrique">Électrique</option>
                          <option value="non_electrique">Non électrique</option>
                        </select>
                      </td>

                      {/* Type d'apport : nature / financier */}
                      <td style={{ textAlign: 'center' }}>
                        <select className="editable-cell" style={{ width: 130 }}
                          value={contribTypes[inv.id] ?? inv.contributionType}
                          onChange={(e) => handleContributionType(inv, e.target.value as 'nature' | 'financier')}>
                          <option value="financier">Apport financier</option>
                          <option value="nature">Apport en nature</option>
                        </select>
                      </td>

                      {/* Fonds propres */}
                      <td style={{ textAlign: 'right' }}>
                        <FinancingCell
                          mode={inputMode}
                          pct={p.equity}
                          amount={inv.financedEquity}
                          totalAmount={inv.amount}
                          disabled={contribTypes[inv.id] === 'nature'}
                          onPctBlur={(v) => handlePct(inv, 'equity', v)}
                          onPctChange={(v) => setPcts((prev) => ({ ...prev, [inv.id]: { ...p, equity: v } }))}
                          onAmountBlur={(v) => handleFinancedAmount(inv, 'equity', v)}
                        />
                      </td>

                      {/* Subvention */}
                      <td style={{ textAlign: 'right' }}>
                        <FinancingCell
                          mode={inputMode}
                          pct={p.grant}
                          amount={inv.financedGrant}
                          totalAmount={inv.amount}
                          disabled={contribTypes[inv.id] === 'nature'}
                          onPctBlur={(v) => handlePct(inv, 'grant', v)}
                          onPctChange={(v) => setPcts((prev) => ({ ...prev, [inv.id]: { ...p, grant: v } }))}
                          onAmountBlur={(v) => handleFinancedAmount(inv, 'grant', v)}
                        />
                      </td>

                      {/* Emprunt */}
                      <td style={{ textAlign: 'right' }}>
                        <FinancingCell
                          mode={inputMode}
                          pct={p.loan}
                          amount={inv.financedLoan}
                          totalAmount={inv.amount}
                          disabled={contribTypes[inv.id] === 'nature'}
                          onPctBlur={(v) => handlePct(inv, 'loan', v)}
                          onPctChange={(v) => setPcts((prev) => ({ ...prev, [inv.id]: { ...p, loan: v } }))}
                          onAmountBlur={(v) => handleFinancedAmount(inv, 'loan', v)}
                        />
                      </td>

                      {/* Taux emprunt */}
                      <td style={{ textAlign: 'right' }}>
                        <input type="number" className="editable-cell" style={{ width: 60, textAlign: 'right' }}
                          step="0.5" defaultValue={inv.loanRate} min={0}
                          ref={(el) => { arrayRefs.current[`${inv.id}-rate`] = el }} />
                      </td>

                      {/* Durée emprunt */}
                      <td style={{ textAlign: 'right' }}>
                        <input type="number" className="editable-cell" style={{ width: 60, textAlign: 'right' }}
                          defaultValue={inv.loanYears} min={1}
                          ref={(el) => { arrayRefs.current[`${inv.id}-years`] = el }} />
                      </td>

                      {/* Total % */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 'var(--text-xs)', color: ok ? '#16a34a' : '#dc2626' }}>
                          <i className={`fas ${ok ? 'fa-check-circle' : 'fa-circle-exclamation'}`} />
                          {rowDisplaySum(inv)}
                        </span>
                      </td>

                      <td>
                        <button className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 16 }}
                          onClick={() => handleDelete(inv.id)}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 600 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAriary(totalInvest)}</td>
                  <td />
                  <td /><td />
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatAriary(totalEquity)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>{pctOf(totalEquity)} %</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatAriary(totalGrant)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>{pctOf(totalGrant)} %</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatAriary(totalLoan)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>{pctOf(totalLoan)} %</div>
                  </td>
                  <td /><td />
                  <td style={{ textAlign: 'center' }}>
                    {!hasErrors
                      ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 'var(--text-xs)' }}><i className="fas fa-check-circle" style={{ marginRight: 4 }} />OK</span>
                      : <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 'var(--text-xs)' }}><i className="fas fa-circle-exclamation" style={{ marginRight: 4 }} />Erreur</span>
                    }
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Calcul des amortissements (Compte de résultat) ── */}
      {company.investments.length > 0 && (() => {
        const depTable = buildDepreciationTable(company.investments)
        const totalAmort = depTable.totalAnnualDepreciation
        return (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-calculator" style={{ color: 'var(--color-primary)' }} />
              Calcul des amortissements - Compte de résultat
            </h4>
            <div className="card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th style={{ textAlign: 'right' }}>Montant</th>
                      <th style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>÷</th>
                      <th style={{ textAlign: 'center' }}>Durée</th>
                      <th style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>=</th>
                      <th style={{ textAlign: 'right', background: '#eff6ff' }}>Annuité (Ar/an)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depTable.byInvestment.map((row, i) => {
                      const inv = company.investments[i]
                      if (!inv) return null
                      return (
                        <tr key={row.investmentId}>
                          <td style={{ fontWeight: 600 }}>{inv.name}</td>
                          <td style={{ textAlign: 'right' }}>{formatAriary(inv.amount)}</td>
                          <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 16 }}>÷</td>
                          <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{inv.usefulLife} ans</td>
                          <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 16 }}>=</td>
                          <td style={{ textAlign: 'right', background: '#eff6ff', fontWeight: 700, color: '#1d4ed8' }}>
                            {formatAriary(row.annualDepreciation)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0fdf4' }}>
                      <td colSpan={5} style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                        Total amortissements An 1 (Compte de résultat)
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: 'var(--text-base)' }}>
                        {formatAriary(totalAmort)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

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

interface FinancingCellProps {
  mode: 'pct' | 'amount'
  pct: number
  amount: number
  totalAmount: number
  disabled?: boolean
  onPctChange: (v: number) => void
  onPctBlur: (v: number) => void
  onAmountBlur: (v: number) => void
}

function FinancingCell({ mode, pct, amount, totalAmount, disabled, onPctChange, onPctBlur, onAmountBlur }: FinancingCellProps) {
  const [localPct, setLocalPct] = useState(String(pct))
  const prevPct = useRef(pct)

  useEffect(() => {
    if (pct !== prevPct.current) {
      prevPct.current = pct
      setLocalPct(String(pct))
    }
  }, [pct])

  if (mode === 'pct') {
    const numericPct = parseFloat(localPct) || 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <input
            type="number" className="editable-cell"
            style={{ width: 70, textAlign: 'right' }}
            value={localPct} min={0} max={100} step={0.1}
            disabled={disabled}
            onChange={(e) => {
              setLocalPct(e.target.value)
              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
              onPctChange(v)
            }}
            onBlur={(e) => {
              const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
              setLocalPct(String(v))
              prevPct.current = v
              onPctBlur(v)
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>%</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
          {formatAriary(Math.round(totalAmount * numericPct / 100))}
        </div>
      </div>
    )
  }

  // Mode Ar
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <NumInput
        className="editable-cell"
        style={{ width: 110, textAlign: 'right' }}
        defaultValue={amount} min={0}
        disabled={disabled}
        onBlur={(v) => onAmountBlur(v)}
      />
      <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>
        {totalAmount > 0 ? `${round1((amount / totalAmount) * 100)} %` : '0 %'}
      </div>
    </div>
  )
}

const saveAllBtn: React.CSSProperties = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '6px 16px', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
const saveAllBtnOk: React.CSSProperties = { ...saveAllBtn, background: '#dcfce7', border: '1px solid #4ade80', color: '#15803d' }

const styles: Record<string, React.CSSProperties> = {
  addBar: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    marginBottom: 'var(--space-5)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
  },
  modeTag: {
    marginLeft: 4,
    background: 'var(--color-primary)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 4,
    verticalAlign: 'middle',
  },
}
