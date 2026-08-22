import { useNavigate } from 'react-router-dom'
import { useCompanyStore } from '@/stores/companyStore'
import { useAuthStore } from '@/stores/authStore'
import { canExport as checkCanExport, safeRole } from '@/utils/permissions'

interface SectionItem {
  id: string
  label: string
  icon: string
  description: string
}

interface SectionGroup {
  label: string
  items: SectionItem[]
}

const sectionGroups: SectionGroup[] = [
  {
    label: 'Données de base',
    items: [
      { id: 'entreprise',    label: 'Entreprise',          icon: 'fa-building-user',       description: 'Régime fiscal, paramètres de l\'entreprise' },
      { id: 'products',      label: 'Produits & Ventes',   icon: 'fa-chart-line',           description: "Chiffre d\'affaires prévisionnel" },
      { id: 'materials',     label: 'Matières premières',  icon: 'fa-boxes-stacked',        description: 'Coûts des matières' },
      { id: 'staff',         label: 'Personnel',            icon: 'fa-users',                description: 'Masse salariale & taux de croissance' },
      { id: 'expenses',      label: 'Autres charges',       icon: 'fa-receipt',              description: "Charges d\'exploitation" },
      { id: 'investments',   label: 'Investissements',      icon: 'fa-building',             description: 'Immobilisations & financement' },
    ],
  },
  {
    label: 'Tableaux financiers',
    items: [
      { id: 'results',       label: 'Compte de résultats', icon: 'fa-table-list',           description: 'Compte de résultat prévisionnel' },
      { id: 'cashflow',      label: 'Trésorerie',           icon: 'fa-water',                description: 'Flux de trésorerie & remboursements' },
      { id: 'balance',       label: 'Bilans',               icon: 'fa-scale-balanced',       description: 'Bilan prévisionnel 5 ans' },
      { id: 'profitability', label: 'Rentabilité',          icon: 'fa-chart-pie',            description: 'VAN, TRI, ratios & indicateurs' },
      { id: 'financing',     label: 'Plan de financement',  icon: 'fa-diagram-project',      description: 'Ressources et emplois' },
    ],
  },
  {
    label: 'Rapport',
    items: [
      { id: 'synthese',      label: 'Synthèse',             icon: 'fa-file-lines',           description: "Vue d\'ensemble complète du business plan" },
      { id: 'export',        label: 'Export Excel',         icon: 'fa-file-excel',           description: 'Export complet en fichier Excel' },
    ],
  },
]

interface Props {
  companyName: string
  isOpen?: boolean
  onClose?: () => void
}

export default function EditorSidebar({ companyName: _companyName, isOpen = false, onClose }: Props) {
  const navigate = useNavigate()
  const activeSection = useCompanyStore((s) => s.activeSection)
  const setActiveSection = useCompanyStore((s) => s.setActiveSection)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  // Seuls les admins peuvent exporter en Excel
  const canExport = checkCanExport(safeRole(user?.role))

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleSectionClick(sectionId: string) {
    setActiveSection(sectionId as Parameters<typeof setActiveSection>[0])
    onClose?.()
  }

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img src="/logo-aides.png" alt="AIDES" style={{ width: '73%', maxWidth: 165, display: 'block', margin: '0 auto 4px' }} />
      </div>

      {/* Sections nav */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {sectionGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items
              .filter((section) => section.id !== 'export' || canExport)
              .map((section) => (
                <button
                  key={section.id}
                  className={`sidebar-nav-item ${activeSection === section.id ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
                  onClick={() => handleSectionClick(section.id)}
                  title={section.description}
                >
                  <i className={`fas ${section.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 13, flexShrink: 0 }} />
                  {section.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: '#9ca3af' }}
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }} />
          Déconnexion
        </button>
      </div>
    </aside>
  </>
  )
}
