import { useState, useRef } from 'react'
import { offlineProductApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import { formatAriary } from '@/calculations/calculations'
import type { Product } from '@/types'
import HelpButton from '@/components/ui/HelpButton'
import NumInput, { parseFormattedNum } from '@/components/ui/NumInput'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const GROWTH_YEARS = ['An 2','An 3','An 4','An 5']

function allSame(values: number[]): boolean {
  return values.length > 0 && values.every((v) => v === values[0])
}

interface UniformState { enabled: boolean; value: number }

function initUniformFor(products: Product[], field: 'monthlyQty' | 'monthlyPrice'): Record<number, UniformState> {
  const map: Record<number, UniformState> = {}
  products.forEach((p) => {
    const arr = p[field]
    map[p.id] = { enabled: allSame(arr), value: arr[0] ?? 0 }
  })
  return map
}

export default function ProductsSection() {
  const company       = useCompanyStore((s) => s.company)!
  const addProduct    = useCompanyStore((s) => s.addProduct)
  const updateProduct = useCompanyStore((s) => s.updateProduct)
  const removeProduct = useCompanyStore((s) => s.removeProduct)

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const arrayRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [uniformQty, setUniformQty] = useState<Record<number, UniformState>>(() =>
    initUniformFor(company.products, 'monthlyQty')
  )
  const [uniformPrice, setUniformPrice] = useState<Record<number, UniformState>>(() =>
    initUniformFor(company.products, 'monthlyPrice')
  )


  async function handleAddProduct() {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      const p = await offlineProductApi.create(company.id, { name: newName.trim() })
      addProduct(p)
      setUniformQty((prev) => ({ ...prev, [p.id]: { enabled: true, value: 0 } }))
      setUniformPrice((prev) => ({ ...prev, [p.id]: { enabled: true, value: 0 } }))
      setNewName('')
    } finally { setIsAdding(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce produit ?')) return
    await offlineProductApi.delete(id, company.id)
    removeProduct(id)
  }

  // ── Tout est désormais sauvegardé via "Enregistrer tout" — pas d'appel API au blur ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleQty(_productId: number, _idx: number, _val: number) {}

  function handleUniformQty(productId: number, val: number) {
    setUniformQty((prev) => ({ ...prev, [productId]: { enabled: true, value: val } }))
  }

  function toggleQtyMode(product: Product) {
    setUniformQty((prev) => {
      const cur = prev[product.id] ?? { enabled: false, value: 0 }
      return { ...prev, [product.id]: { enabled: !cur.enabled, value: product.monthlyQty[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handlePrice(_productId: number, _idx: number, _val: number) {}

  function handleUniformPrice(productId: number, val: number) {
    setUniformPrice((prev) => ({ ...prev, [productId]: { enabled: true, value: val } }))
  }

  function togglePriceMode(product: Product) {
    setUniformPrice((prev) => {
      const cur = prev[product.id] ?? { enabled: false, value: 0 }
      return { ...prev, [product.id]: { enabled: !cur.enabled, value: product.monthlyPrice[0] ?? 0 } }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleGrowth(_productId: number, _idx: number, _val: number) {}

  async function handleSaveAll() {
    setSaving(true)
    try {
      for (const product of useCompanyStore.getState().company?.products ?? []) {
        const name = arrayRefs.current[`${product.id}-name`]?.value?.trim() || product.name
        const uq = uniformQty[product.id]
        const monthlyQty = uq?.enabled
          ? Array(12).fill(uq.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFormattedNum(arrayRefs.current[`${product.id}-qty-${i}`]?.value || '0')
            )
        const up = uniformPrice[product.id]
        const monthlyPrice = up?.enabled
          ? Array(12).fill(up.value)
          : Array.from({ length: 12 }, (_, i) =>
              parseFormattedNum(arrayRefs.current[`${product.id}-price-${i}`]?.value || '0')
            )
        const growthRates = [
          ...Array.from({ length: 4 }, (_, i) =>
            parseFloat(arrayRefs.current[`${product.id}-growth-${i}`]?.value || '0') || 0,
          ),
          product.growthRates[4] ?? 0,
        ]
        const updated = await offlineProductApi.update(product.id, company.id, { name, monthlyQty, monthlyPrice, growthRates })
        updateProduct(product.id, updated)
      }
      setSaved(true)
      setToast('Modifications enregistrées avec succès !')
      setTimeout(() => { setSaved(false); setToast(null) }, 3000)
    } finally { setSaving(false) }
  }

  const totalQty     = (p: Product) => p.monthlyQty.reduce((a, b) => a + b, 0)
  const totalRevenue = (p: Product) => p.monthlyQty.reduce((sum, qty, m) => sum + qty * (p.monthlyPrice[m] ?? 0), 0)
  const grandTotalCA = company.products.reduce((s, p) => s + totalRevenue(p), 0)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            <i className="fas fa-chart-line" style={{ marginRight: 8, color: 'var(--color-primary)' }} />
            Produits & Chiffre d'affaires
          </h3>
          <p className="section-subtitle">Prix unitaire mensuel, quantités mensuelles et taux de croissance An 2-5.</p>
        </div>
        <HelpButton
          title="Produits & Ventes"
          content={"Saisissez vos produits ou services avec leur prix unitaire et leur quantite vendue, mois par mois.\n\n=> Prix mensuel : Le prix peut varier selon la saison (ex : prix du poisson plus eleve a certaines periodes). Mode uniforme = meme prix toute l'annee, mode detaille = un prix different par mois.\n\n=> Mode uniforme (quantite) : Si la quantite est la meme tous les mois, saisissez-la une seule fois.\n\n=> Mode individuel (quantite) : Saisissez une quantite differente pour chaque mois.\n\n=> Taux de croissance annuel : Pourcentage d'augmentation des ventes d'une annee a l'autre (ex: 5% par an). Il s'applique a la quantite ; le profil de prix mensuel se repete a l'identique chaque annee."}
        />
      </div>

      {/* KPI Total CA */}
      {company.products.length > 0 && (
        <div className="kpi-card" style={{ marginBottom: 'var(--space-5)', background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div className="kpi-label">Total Chiffre d'affaires An 1</div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>{formatAriary(grandTotalCA)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: '#16a34a', marginTop: 4 }}>
            {company.products.length} produit{company.products.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Barre ajout + enregistrer */}
      <div style={addBarStyle}>
        <input
          className="form-input"
          style={{ flex: 1, maxWidth: 320 }}
          placeholder="Nom du produit / service..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
        />
        <button className="btn btn-primary" onClick={handleAddProduct} disabled={isAdding || !newName.trim()}>
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          {isAdding ? 'Ajout...' : 'Ajouter'}
        </button>
        {company.products.length > 0 && (
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

      {company.products.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-chart-line" /></div>
          <div className="empty-state-title">Aucun produit</div>
          <p className="empty-state-desc">Ajoutez vos produits ou services ci-dessus.</p>
        </div>
      )}

      {company.products.map((product) => {
        const uq = uniformQty[product.id]   ?? { enabled: false, value: 0 }
        const up = uniformPrice[product.id] ?? { enabled: false, value: 0 }

        return (
          <div key={product.id} className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  style={{ fontWeight: 600, maxWidth: 240 }}
                  defaultValue={product.name}
                  ref={(el) => { arrayRefs.current[`${product.id}-name`] = el }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="kpi-card" style={{ padding: '4px 12px' }}>
                  <div className="kpi-label">CA An 1</div>
                  <div className="kpi-value" style={{ fontSize: 'var(--text-base)' }}>{formatAriary(totalRevenue(product))}</div>
                </div>
                <button onClick={() => handleDelete(product.id)} title="Supprimer ce produit"
                  style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '7px 12px', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>x</span>
                </button>
              </div>
            </div>

            <div className="card-body" style={{ overflowX: 'auto' }}>

              {/* Toggles mode uniforme : prix et quantite, independants */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Prix different par mois</span>
                  <div
                    onClick={() => togglePriceMode(product)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                      background: up.enabled ? 'var(--color-primary)' : '#d1d5db',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: up.enabled ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: up.enabled ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: up.enabled ? 700 : 400 }}>
                    Meme prix toute l'annee
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Quantite differente par mois</span>
                  <div
                    onClick={() => toggleQtyMode(product)}
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
                    Meme quantite tous les mois
                  </span>
                </div>
              </div>

              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 920 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={thLabel}>Libelle</th>
                    {MONTHS.map((m) => <th key={m} style={thCell}>{m}</th>)}
                    <th style={thTotal}>Total An 1</th>
                    <th style={thSep} />
                    {GROWTH_YEARS.map((y) => (
                      <th key={y} style={{ ...thCell, color: 'var(--color-primary)', fontWeight: 700 }}>{y} %</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ── Prix unitaire / mois ── */}
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <td style={tdLabel}>Prix unitaire / mois</td>
                    {up.enabled ? (
                      <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                        <NumInput
                          className="editable-cell"
                          style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                          step={1} min={0}
                          defaultValue={up.value}
                          key={`${product.id}-uniform-price`}
                          onBlur={(v) => handleUniformPrice(product.id, v)}
                        />
                      </td>
                    ) : (
                      product.monthlyPrice.map((v, i) => (
                        <td key={i} style={tdCell}>
                          <NumInput
                            className="editable-cell"
                            style={inputStyle}
                            ref={(el) => { arrayRefs.current[`${product.id}-price-${i}`] = el }}
                            step={1} min={0}
                            defaultValue={v}
                            onBlur={(v2) => handlePrice(product.id, i, v2)}
                          />
                        </td>
                      ))
                    )}
                    <td style={tdTotal} />
                    <td style={tdSep} />
                    {GROWTH_YEARS.map((_, i) => <td key={i} style={tdCell} />)}
                  </tr>

                  {/* ── Quantite vendue / mois ── */}
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <td style={tdLabel}>Qte vendue / mois</td>
                    {uq.enabled ? (
                      <td colSpan={12} style={{ ...tdCell, textAlign: 'center' }}>
                        <NumInput
                          className="editable-cell"
                          style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '0 auto' }}
                          step={0.01} min={0}
                          defaultValue={uq.value}
                          key={`${product.id}-uniform-qty`}
                          onBlur={(v) => handleUniformQty(product.id, v)}
                        />
                      </td>
                    ) : (
                      product.monthlyQty.map((v, i) => (
                        <td key={i} style={tdCell}>
                          <NumInput
                            className="editable-cell"
                            style={inputStyle}
                            ref={(el) => { arrayRefs.current[`${product.id}-qty-${i}`] = el }}
                            step={0.01} min={0}
                            defaultValue={v}
                            onBlur={(v2) => handleQty(product.id, i, v2)}
                          />
                        </td>
                      ))
                    )}
                    <td style={{ ...tdTotal, fontWeight: 700 }}>
                      {totalQty(product).toLocaleString('fr')}
                    </td>
                    <td style={tdSep} />
                    {product.growthRates.slice(0, 4).map((r, i) => (
                      <td key={i} style={tdCell}>
                        <input
                          type="number"
                          className="editable-cell"
                          ref={(el) => { arrayRefs.current[`${product.id}-growth-${i}`] = el }}
                          style={{ ...inputStyle, color: 'var(--color-primary)', fontWeight: 600 }}
                          step={0.5}
                          defaultValue={r}
                          onBlur={(e) => handleGrowth(product.id, i, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* CA mensuel (calcule)*/}
                  <tr>
                    <td style={{ ...tdLabel, color: 'var(--color-text-muted)', fontWeight: 400 }}>CA mensuel (Ar)</td>
                    {product.monthlyQty.map((v, i) => (
                      <td key={i} style={{ ...tdCell, fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {(v * (product.monthlyPrice[i] ?? 0)).toLocaleString('fr')}
                      </td>
                    ))}
                    <td style={{ ...tdTotal, background: '#eaf5e6', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatAriary(totalRevenue(product))}
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
