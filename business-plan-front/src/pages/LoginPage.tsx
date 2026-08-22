import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, ApiError } from '@/api/api'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const { token } = await authApi.login(email, password)
      setToken(token)
      const user = await authApi.me()
      setUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Email ou mot de passe incorrect.' : err.message)
      } else {
        setError('Impossible de se connecter au serveur.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.page}>

      {/* Right panel — login form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          {/* Header */}
          <div style={styles.formHeader}>
            <div style={styles.formLogoWrap}>
              <img src="/logo-aides.png" alt="AIDES" style={{ width: 120, height: 56, objectFit: 'contain', borderRadius: 8 }} />
            </div>
            <h2 style={styles.formTitle}>Connexion</h2>
            <p style={styles.formSubtitle}>Accédez à votre espace Business Plan</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <i className="fas fa-circle-exclamation" style={{ marginRight: 8, flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form} noValidate>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel} htmlFor="email">Adresse email</label>
              <div style={styles.inputWrap}>
                <i className="fas fa-envelope" style={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  style={styles.input}
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel} htmlFor="password">Mot de passe</label>
              <div style={styles.inputWrap}>
                <i className="fas fa-lock" style={styles.inputIcon} />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  style={{ ...styles.input, paddingRight: 44 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  style={styles.eyeBtn}
                  onClick={() => setShowPwd((v) => !v)}
                  title={showPwd ? 'Masquer' : 'Afficher'}
                >
                  <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <i className="fas fa-right-to-bracket" style={{ marginRight: 8 }} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p style={styles.formFooter}>
            Accès réservé aux utilisateurs autorisés par AIDES.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  /* Layout */
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: 'var(--font-sans)',
  },

  /* Left branding panel */
  leftPanel: {
    width: '45%',
    background: 'linear-gradient(160deg, #1e2433 0%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 48px 32px',
    position: 'relative',
    overflow: 'hidden',
  },
  leftInner: {
    display: 'flex',
    flexDirection: 'column',
  },
  headline: {
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.25,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: 40,
    maxWidth: 380,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(245,166,35,0.18)',
    border: '1px solid rgba(245,166,35,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f5a623',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 500,
  },
  attribution: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 0,
  },

  /* Right form panel */
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '32px 24px',
  },
  formCard: {
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    padding: '40px 40px 32px',
    width: '100%',
    maxWidth: 420,
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: 28,
  },
  formLogoWrap: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1e2433',
    margin: '0 0 6px',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
  },

  /* Error box */
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 14,
    padding: '10px 14px',
    marginBottom: 20,
  },

  /* Form fields */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    color: '#9ca3af',
    fontSize: 14,
    pointerEvents: 'none',
  },
  input: {
    paddingLeft: 38,
    width: '100%',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0 2px',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
  },

  /* Submit */
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 700,
    marginTop: 4,
  },

  /* Footer */
  formFooter: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 0,
  },
}
