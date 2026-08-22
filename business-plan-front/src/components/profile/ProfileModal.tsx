import { useState } from 'react'
import { authApi } from '@/api/api'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  onClose: () => void
}

export default function ProfileModal({ onClose }: Props) {
  const user       = useAuthStore((s) => s.user)!
  const updateUser = useAuthStore((s) => s.updateUser)

  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName,  setLastName]  = useState(user.lastName)
  const [email,     setEmail]     = useState(user.email)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [errors,   setErrors]   = useState<string[]>([])
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors([])
    setSuccess(false)

    const payload: Record<string, string> = {}

    if (firstName !== user.firstName) payload.firstName = firstName
    if (lastName  !== user.lastName)  payload.lastName  = lastName
    if (email     !== user.email)     payload.email     = email

    if (newPassword) {
      payload.currentPassword = currentPassword
      payload.newPassword     = newPassword
      payload.confirmPassword = confirmPassword
    }

    if (Object.keys(payload).length === 0) {
      setErrors(['Aucune modification détectée.'])
      return
    }

    setIsSaving(true)
    try {
      const updated = await authApi.updateProfile(payload)
      updateUser(updated)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const apiErr = err as { status: number; message?: string }
        if (apiErr.status === 422) {
          try {
            const body = JSON.parse(apiErr.message ?? '{}')
            setErrors(body.errors ?? ['Erreur de validation.'])
          } catch {
            setErrors(['Erreur lors de la mise à jour.'])
          }
        } else {
          setErrors(['Erreur lors de la mise à jour. Veuillez réessayer.'])
        }
      } else {
        setErrors(['Erreur lors de la mise à jour. Veuillez réessayer.'])
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* ── En-tête ── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={S.avatar}>{user.initials}</div>
            <div>
              <h3 style={S.title}>Mon profil</h3>
              <p style={S.subtitle}>Modifier mes informations personnelles</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 18, padding: '4px 8px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>

          {/* ── Alertes ── */}
          {errors.length > 0 && (
            <div style={S.errorBox}>
              {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
            </div>
          )}
          {success && (
            <div style={S.successBox}>✓ Profil mis à jour avec succès.</div>
          )}

          {/* ── Informations personnelles ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Informations personnelles</div>
            <div style={S.grid2}>
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input
                  className="form-input"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  className="form-input"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Adresse e-mail</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ── Changement de mot de passe ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              Changer le mot de passe
              <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                (laisser vide pour ne pas changer)
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe actuel</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Requis pour changer le mot de passe"
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={S.eyeBtn}
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  <i className={`fas fa-eye${showPassword ? '-slash' : ''}`} />
                </button>
              </div>
            </div>
            <div style={S.grid2}>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer le nouveau mot de passe</label>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répéter le mot de passe"
                />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={S.footer}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <><i className="fas fa-spinner fa-spin" /> Enregistrement…</> : '💾 Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.45)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         200,
  },
  modal: {
    background:    'var(--color-surface)',
    borderRadius:  'var(--radius-lg)',
    boxShadow:     'var(--shadow-lg)',
    width:         '100%',
    maxWidth:      520,
    display:       'flex',
    flexDirection: 'column',
    gap:           0,
    overflow:      'hidden',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        'var(--space-5) var(--space-6)',
    borderBottom:   '1px solid var(--color-border)',
    background:     'var(--color-surface-2)',
  },
  avatar: {
    width:          44,
    height:         44,
    borderRadius:   '50%',
    background:     'var(--color-primary)',
    color:          '#fff',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontWeight:     700,
    fontSize:       18,
    flexShrink:     0,
  },
  title:    { margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           0,
    padding:       'var(--space-5) var(--space-6)',
    overflowY:     'auto',
    maxHeight:     '70vh',
  },
  section: {
    marginBottom: 'var(--space-5)',
  },
  sectionTitle: {
    fontSize:     'var(--text-sm)',
    fontWeight:   700,
    color:        'var(--color-text)',
    marginBottom: 'var(--space-3)',
    paddingBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-border)',
  },
  grid2: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 'var(--space-3)',
  },
  errorBox: {
    background:   '#fef2f2',
    border:       '1px solid #fca5a5',
    borderRadius: 'var(--radius)',
    padding:      'var(--space-3)',
    color:        '#dc2626',
    fontSize:     'var(--text-sm)',
    marginBottom: 'var(--space-4)',
    display:      'flex',
    flexDirection: 'column',
    gap:           4,
  },
  successBox: {
    background:   '#f0fdf4',
    border:       '1px solid #86efac',
    borderRadius: 'var(--radius)',
    padding:      'var(--space-3)',
    color:        '#16a34a',
    fontSize:     'var(--text-sm)',
    fontWeight:   600,
    marginBottom: 'var(--space-4)',
  },
  footer: {
    display:        'flex',
    justifyContent: 'flex-end',
    gap:            'var(--space-3)',
    paddingTop:     'var(--space-4)',
    borderTop:      '1px solid var(--color-border)',
    marginTop:      'var(--space-2)',
  },
  eyeBtn: {
    position:   'absolute',
    right:      10,
    top:        '50%',
    transform:  'translateY(-50%)',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    color:      'var(--color-text-muted)',
    padding:    0,
    fontSize:   14,
  },
}
