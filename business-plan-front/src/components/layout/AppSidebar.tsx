import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import ProfileModal from '@/components/profile/ProfileModal'
import { canManageUsers, safeRole } from '@/utils/permissions'

interface NavItem {
  to: string
  label: string
  icon: string
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: 'fa-gauge-high' },
]

const adminNav: NavItem[] = [
  { to: '/users', label: 'Utilisateurs', icon: 'fa-users' },
]

interface Props {
  isOpen?: boolean
  onClose?: () => void
}

export default function AppSidebar({ isOpen = false, onClose }: Props) {
  const navigate = useNavigate()
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [showProfile, setShowProfile] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Modal profil */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo-aides.png" alt="AIDES" style={{ width: '73%', maxWidth: 165, display: 'block', margin: '0 auto' }} />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 13, flexShrink: 0 }} />
            {item.label}
          </NavLink>
        ))}

        {/* Menu admin uniquement */}
        {canManageUsers(safeRole(user?.role)) && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>Administration</div>
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 13, flexShrink: 0 }} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer — user info + logout */}
      <div className="sidebar-footer">
        <button
          style={{ ...styles.userBlock, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 'var(--radius)', padding: '6px 8px', transition: 'background 0.15s' }}
          onClick={() => setShowProfile(true)}
          title="Modifier mon profil"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div style={styles.avatar}>{user?.initials ?? '?'}</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.fullName ?? 'Utilisateur'}</div>
            <div style={{ ...styles.userEmail, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{user?.email ?? ''}</span>
              <i className="fas fa-pencil" style={{ fontSize: 9, opacity: 0.5 }} />
            </div>
          </div>
        </button>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: '#9ca3af', marginTop: 4 }}
          onClick={handleLogout}
        >
          Déconnexion
        </button>
      </div>
    </aside>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  userBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
background: 'var(--color-primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail: { fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
