import { useState, type FormEvent } from 'react'
import { offlineSettingsApi, offlineCompanyApi } from '@/api/offlineApi'
import { useCompanyStore } from '@/stores/companyStore'
import type { CompanySettings } from '@/types'
import HelpButton from '@/components/ui/HelpButton'
import NumInput from '@/components/ui/NumInput'

const DEFAULT_SETTINGS: CompanySettings = {
  infl2: 3, infl3: 3, infl4: 3, infl5: 3,
  discountRate: 10,
  taxRegime: 'IR',
  taxRate: 20,
  taxRateIs: 20,
  fondsRoulement: 0,
}

export default function SettingsSection() {
  const company           = useCompanyStore((s) => s.company)!
  const updateSettings    = useCompanyStore((s) => s.updateSettings)
  const updateCompanyMeta = useCompanyStore((s) => s.updateCompanyMeta)

  const [form, setForm] = useState<CompanySettings>(company.settings ?? DEFAULT_SETTINGS)
  const [meta, setMeta] = useState({
    name:                company.name                ?? '',
    secteur:             company.secteur             ?? '',
    promoteur:           company.promoteur           ?? '',
    descriptionActivite: company.descriptionActivite ?? '',
    marche:              company.marche              ?? '',
    genre:               company.genre               ?? ('' as '' | 'femme' | 'homme'),
    modeleEconomique:    company.modeleEconomique    ?? ([] as ('production' | 'service')[]),
    etatActivite:        company.etatActivite        ?? ('' as '' | 'existante' | 'nouvelle'),
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved]       = useState(false)

  function handleChange(field: keyof CompanySettings, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'taxRegime' ? value : parseFloat(value) || 0,
    }))
    setSaved(false)
  }

  function handleMeta(field: keyof typeof meta, value: string) {
    setMeta((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function toggleModeleEconomique(value: 'production' | 'service') {
    setMeta((prev) => ({
      ...prev,
      modeleEconomique: prev.modeleEconomique.includes(value)
        ? prev.modeleEconomique.filter((v) => v !== value)
        : [...prev.modeleEconomique, value],
    }))
    setSaved(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const [updatedSettings] = await Promise.all([
        offlineSettingsApi.update(company.id, form),
        offlineCompanyApi.updateMeta(company.id, {
          ...meta,
          descriptionActivite: meta.descriptionActivite || null,
          marche:              meta.marche              || null,
          genre:               (meta.genre              || null) as 'femme' | 'homme' | null,
          modeleEconomique:    meta.modeleEconomique.length > 0 ? meta.modeleEconomique : null,
          etatActivite:        (meta.etatActivite       || null) as 'existante' | 'nouvelle' | null,
        }),
      ])
      updateSettings(updatedSettings)
      updateCompanyMeta(meta)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>
              <i className="fas fa-building-user" style={{ marginRight: 8, color: '#f5a623' }} />
              Entreprise
            </h3>
            <p className="section-subtitle">
              {meta.name}
              {meta.secteur   ? ` · ${meta.secteur}`              : ''}
              {meta.promoteur ? ` · Promoteur : ${meta.promoteur}` : ''}
            </p>
          </div>
          <HelpButton
            title="Paramètres entreprise"
            content={"Définissez les informations de base de votre entreprise.\n\n => Régime fiscal : IR = Impôt sur le Revenu (entreprise individuelle), IS = Impôt sur les Sociétés.\n\n=> Taux d'actualisation : Taux utilisé pour calculer la VAN. En général 10% pour Madagascar.\n\n=> Fonds de roulement : Capital de départ supplémentaire pour couvrir les premiers mois d'exploitation."}
          />
        </div>
        {saved && <span className="badge badge-success">✓ Enregistré</span>}
      </div>

      <form onSubmit={handleSave}>
        <div style={styles.grid}>

          {/* ── Informations entreprise ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                Informations entreprise
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise</label>
                <input className="form-input" value={meta.name}
                  placeholder="Ex : Boulangerie Rabe"
                  onChange={(e) => handleMeta('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Secteur d'activité</label>
                <input className="form-input" value={meta.secteur}
                  placeholder="Ex : Commerce, Agriculture…"
                  onChange={(e) => handleMeta('secteur', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Promoteur / Responsable</label>
                <input className="form-input" value={meta.promoteur}
                  placeholder="Ex : Rabe Jean"
                  onChange={(e) => handleMeta('promoteur', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Genre du promoteur</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {(['femme', 'homme'] as const).map((g) => (
                    <label key={g} style={choiceStyle(meta.genre === g)}>
                      <input type="radio" name="genre" value={g} checked={meta.genre === g}
                        onChange={() => handleMeta('genre', g)} style={{ marginRight: 6 }} />
                      {g === 'femme' ? 'Femme' : 'Homme'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Profil de l'activité ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                Profil de l'activité
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Description de l'activité</label>
                <textarea className="form-input" rows={3} value={meta.descriptionActivite}
                  placeholder="Décrivez brièvement l'activité de l'entreprise…"
                  onChange={(e) => handleMeta('descriptionActivite', e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Marché</label>
                <textarea className="form-input" rows={2} value={meta.marche}
                  placeholder="client , concurrence , ... "
                  onChange={(e) => handleMeta('marche', e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Modèle économique</label>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  {([['production', 'Production de biens'], ['service', 'Vente de services']] as const).map(([v, label]) => (
                    <label key={v} style={choiceStyle(meta.modeleEconomique.includes(v))}>
                      <input type="checkbox" name="modeleEconomique" value={v} checked={meta.modeleEconomique.includes(v)}
                        onChange={() => toggleModeleEconomique(v)} style={{ marginRight: 6 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">État de l'activité</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {([['existante', 'Existante'], ['nouvelle', 'Nouvelle']] as const).map(([v, label]) => (
                    <label key={v} style={choiceStyle(meta.etatActivite === v)}>
                      <input type="radio" name="etatActivite" value={v} checked={meta.etatActivite === v}
                        onChange={() => handleMeta('etatActivite', v)} style={{ marginRight: 6 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Régime fiscal ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: 'var(--text-md)' }}>Régime fiscal</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Régime d'imposition</label>
                <select className="form-select" value={form.taxRegime}
                  onChange={(e) => handleChange('taxRegime', e.target.value)}>
                  <option value="IR">IR – Impôt sur le Revenu</option>
                  <option value="IS">IS – Impôt sur les Sociétés</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="form-label" style={{ marginBottom: 0 }}>Taux IR</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" className="form-input" style={{ width: 80, textAlign: 'right' }}
                    step="0.5" min="0" max="100" value={form.taxRate}
                    onChange={(e) => handleChange('taxRate', e.target.value)} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="form-label" style={{ marginBottom: 0 }}>Taux IS</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" className="form-input" style={{ width: 80, textAlign: 'right' }}
                    step="0.5" min="0" max="100" value={form.taxRateIs}
                    onChange={(e) => handleChange('taxRateIs', e.target.value)} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Paramètres financiers ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: 'var(--text-md)' }}>Paramètres financiers</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="flex items-center justify-between gap-4">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <i className="fas fa-percent" style={{ marginRight: 6, fontSize: 11, color: 'var(--color-accent)' }} />
                  Taux d'actualisation (VAN)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" className="form-input" style={{ width: 80, textAlign: 'right' }}
                    step="0.5" min="0" max="100" value={form.discountRate}
                    onChange={(e) => handleChange('discountRate', e.target.value)} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <i className="fas fa-coins" style={{ marginRight: 6, fontSize: 11, color: 'var(--color-accent)' }} />
                  Fonds de roulement initial
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NumInput className="form-input" style={{ width: 120, textAlign: 'right' }}
                    step={1000} min={0} defaultValue={form.fondsRoulement}
                    onBlur={(v) => handleChange('fondsRoulement', String(v))} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Ar</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : '💾 Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

function choiceStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', cursor: 'pointer',
    padding: '6px 14px', borderRadius: 8, fontSize: 'var(--text-sm)', fontWeight: 500,
    border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
    background: selected ? 'var(--color-primary-light, #e8f5e3)' : 'var(--color-surface)',
    transition: 'all 0.15s',
  }
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--space-4)',
  },
}
