import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi, ApiError, type UserSummary } from '@/api/api'
import AppSidebar from '@/components/layout/AppSidebar'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_ICONS, ROLE_COLORS, type UserRole } from '@/utils/permissions'

interface CreatedResult {
  user: UserSummary
  tempPassword: string
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const [users, setUsers]           = useState<UserSummary[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const [showForm, setShowForm]       = useState(false)
  const [formEmail, setFormEmail]     = useState('')
  const [formFirst, setFormFirst]     = useState('')
  const [formLast, setFormLast]       = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPassword2, setFormPassword2] = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [formRole, setFormRole]       = useState<UserRole>('standard')
  const [isCreating, setIsCreating]   = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)

  const [created, setCreated]       = useState<CreatedResult | null>(null)
  const [copied, setCopied]         = useState(false)

  // Édition rôle
  const [editUser, setEditUser]     = useState<UserSummary | null>(null)
  const [editRole, setEditRole]     = useState<UserRole>('standard')
  const [isSaving, setIsSaving]     = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await userApi.list()
      setUsers(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function openForm() {
    setFormEmail(''); setFormFirst(''); setFormLast('')
    setFormPassword(''); setFormPassword2('')
    setShowPwd(false)
    setFormRole('standard')
    setFormError(null); setCreated(null); setCopied(false)
    setShowForm(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formEmail.trim()) return
    if (formPassword.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (formPassword !== formPassword2) {
      setFormError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setFormError(null)
    setIsCreating(true)

    try {
      const newUser = await userApi.create(
        formEmail.trim(),
        formPassword,
        formFirst.trim(),
        formLast.trim(),
        formRole,
      )
      setCreated({ user: newUser, tempPassword: formPassword })
      setShowForm(false)
      setUsers((prev) => [newUser, ...prev])
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de la création.")
    } finally {
      setIsCreating(false)
    }
  }

  function openEdit(u: UserSummary) {
    setEditUser(u)
    setEditRole(u.role)
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!editUser) return
    setIsSaving(true)
    setEditError(null)
    try {
      const updated = await userApi.update(editUser.id, { role: editRole })
      setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u))
      setEditUser(null)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Supprimer le compte de ${name} ?\n\nSi cet utilisateur a des projets, son compte sera désactivé. Sinon, il sera supprimé définitivement.`)) return
    try {
      const result = await userApi.delete(id) as { deleted?: boolean; deactivated?: boolean; message?: string } | void
      if (result && typeof result === 'object' && 'deactivated' in result && result.deactivated) {
        // Compte désactivé → mettre à jour isActive dans la liste
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: false } : u))
        alert(result.message ?? 'Compte désactivé.')
      } else {
        // Compte supprimé → retirer de la liste
        setUsers((prev) => prev.filter((u) => u.id !== id))
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erreur lors de la suppression.')
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback : sélection manuelle
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <i className="fas fa-bars" />
          </button>
          <img src="/logo-aides.png" alt="AIDES" style={{ height: 32 }} />
        </div>

        {/* Header */}
        <div style={styles.topBar}>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 4 }}>
              <i className="fas fa-arrow-left" style={{ marginRight: 6, fontSize: 11 }} />
              Tableau de bord
            </button>
            <h2 style={styles.title}>
              <i className="fas fa-users" style={{ marginRight: 10, color: 'var(--color-primary)' }} />
              Gestion des utilisateurs
            </h2>
            <p style={styles.subtitle}>Créez des comptes pour les membres de l'équipe AIDES.</p>
          </div>
          <button className="btn btn-primary" onClick={openForm}>
            <i className="fas fa-user-plus" style={{ marginRight: 6 }} />
            Nouveau compte
          </button>
        </div>

        {/* ── Mot de passe temporaire affiché après création ── */}
        {created && (
          <div style={styles.successBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <i className="fas fa-check-circle" style={{ fontSize: 22, color: 'var(--color-success)' }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                  Compte créé {created.user.fullName}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: '#92400e', fontWeight: 500, marginBottom: 10 }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />
              Compte créé avec succès. Transmettez le mot de passe à l'utilisateur de façon sécurisée.
            </p>

            <div style={styles.passwordBox}>
              <code style={styles.passwordText}>{created.tempPassword}</code>
              <button
                style={styles.copyBtn}
                onClick={() => handleCopy(created.tempPassword)}
              >
                {copied
                  ? <><i className="fas fa-check" style={{ marginRight: 6 }} />Copié !</>
                  : <><i className="fas fa-copy" style={{ marginRight: 6 }} />Copier</>
                }
              </button>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 10 }}>
              L'utilisateur se connecte avec cet email et ce mot de passe, puis peut le modifier depuis son profil.
            </p>

            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => setCreated(null)}
            >
              <i className="fas fa-times" style={{ marginRight: 6 }} />
              Fermer
            </button>
          </div>
        )}

        {/* ── Modale d'édition permissions ── */}
        {editUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, margin: 0 }}>
              <div className="card-header">
                <span className="card-title">
                  <i className="fas fa-user-pen" style={{ marginRight: 8 }} />
                  Modifier : {editUser.fullName}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(null)}>
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="card-body">
                {editError && (
                  <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />{editError}
                  </div>
                )}

                <RoleSelector
                  value={editRole}
                  onChange={setEditRole}
                  title="Modifier le rôle"
                />

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enregistrement…</> : <><i className="fas fa-check" style={{ marginRight: 6 }} />Enregistrer</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditUser(null)}>Annuler</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Formulaire de création ── */}
        {showForm && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-primary)' }}>
            <div className="card-header">
              <span className="card-title">
                <i className="fas fa-user-plus" style={{ marginRight: 8 }} />
                Créer un nouvel utilisateur
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="card-body">
              {formError && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Prénom</label>
                    <input className="form-input" placeholder="Jean" value={formFirst}
                      onChange={(e) => setFormFirst(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nom</label>
                    <input className="form-input" placeholder="Dupont" value={formLast}
                      onChange={(e) => setFormLast(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Email professionnel *</label>
                    <input type="email" className="form-input" required
                      placeholder="jean.dupont@aides-mada.com"
                      value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mot de passe *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="form-input"
                        required
                        minLength={8}
                        placeholder="Min. 8 caractères"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                      >
                        <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Confirmer le mot de passe *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="form-input"
                        required
                        placeholder="Répétez le mot de passe"
                        value={formPassword2}
                        onChange={(e) => setFormPassword2(e.target.value)}
                        style={{ paddingRight: 40, borderColor: formPassword2 && formPassword !== formPassword2 ? 'var(--color-danger)' : undefined }}
                      />
                    </div>
                    {formPassword2 && formPassword !== formPassword2 && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: 4 }}>
                        Les mots de passe ne correspondent pas.
                      </p>
                    )}
                  </div>
                </div>

                <RoleSelector
                  value={formRole}
                  onChange={setFormRole}
                  title="Rôle de l'utilisateur"
                />

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreating || !formEmail.trim() || !formPassword || formPassword !== formPassword2}
                  >
                    {isCreating
                      ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Création…</>
                      : <><i className="fas fa-user-plus" style={{ marginRight: 6 }} />Créer le compte</>
                    }
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liste */}
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" />Chargement...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fas fa-users" /></div>
            <div className="empty-state-title">Aucun utilisateur</div>
            <p className="empty-state-desc">Creez le premier compte membre de l'equipe.</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <i className="fas fa-users" style={{ marginRight: 8 }} />
                Membres de l'equipe ({users.length})
              </span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Membre depuis</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={styles.avatar}>{u.initials}</div>
                          <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ROLE_COLORS[u.role]?.bg ?? '#f1f5f9', color: ROLE_COLORS[u.role]?.text ?? '#475569' }}>
                          <i className={`fas ${ROLE_ICONS[u.role] ?? 'fa-user'}`} style={{ fontSize: 10 }} />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, maxWidth: 200 }}>
                          {ROLE_DESCRIPTIONS[u.role]}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: u.isActive ? '#dcfce7' : '#fee2e2', color: u.isActive ? '#166534' : '#991b1b' }}>
                          <i className="fas fa-circle" style={{ fontSize: 6, marginRight: 5 }} />
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => openEdit(u)}
                            style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 6, padding: '4px 10px' }}>
                            <i className="fas fa-pen" style={{ marginRight: 4 }} />Modifier
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Supprimer" onClick={() => handleDelete(u.id, u.fullName)}
                            style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 6, padding: '4px 10px' }}>
                            <i className="fas fa-trash" style={{ marginRight: 4 }} />Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Composant RoleSelector ───────────────────────────────────────────────────

function RoleSelector({ value, onChange, title }: { value: UserRole; onChange: (r: UserRole) => void; title: string }) {
  const roles: UserRole[] = ['admin', 'manager', 'editor', 'viewer', 'standard']
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="fas fa-shield-halved" style={{ color: 'var(--color-primary)' }} />
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roles.map((role) => {
          const isSelected = value === role
          return (
            <label
              key={role}
              onClick={() => onChange(role)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
                borderRadius: 8, cursor: 'pointer',
                border: isSelected ? `2px solid ${ROLE_COLORS[role].text}` : '2px solid var(--color-border)',
                background: isSelected ? ROLE_COLORS[role].bg : 'var(--color-surface)',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="roleSelector"
                checked={isSelected}
                onChange={() => onChange(role)}
                style={{ marginTop: 3, accentColor: ROLE_COLORS[role].text }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <i className={`fas ${ROLE_ICONS[role]}`} style={{ fontSize: 12, color: ROLE_COLORS[role].text }} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: ROLE_COLORS[role].text }}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  topBar:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' },
  title:     { fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', margin: 0 },
  subtitle:  { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4 },
  successBox: { background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' },
  avatar:    { width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
}
