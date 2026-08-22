import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { companyApi } from '@/api/api'
import { syncService } from '@/services/syncService'
import { useNetworkStore } from '@/stores/networkStore'
import { useCompanyStore, type EditorSection } from '@/stores/companyStore'
import { useAuthStore } from '@/stores/authStore'
import { canEditNonValidated, canEditValidated, canExport, safeRole } from '@/utils/permissions'
import SyncIndicator from '@/components/ui/SyncIndicator'
import EditorSidebar from '@/components/editor/EditorSidebar'
import SettingsSection from '@/components/editor/sections/SettingsSection'
import ProductsSection from '@/components/editor/sections/ProductsSection'
import MaterialsSection from '@/components/editor/sections/MaterialsSection'
import StaffSection from '@/components/editor/sections/StaffSection'
import ExpensesSection from '@/components/editor/sections/ExpensesSection'
import InvestmentsSection from '@/components/editor/sections/InvestmentsSection'
import FundingSection from '@/components/editor/sections/FundingSection'
import ResultsSection from '@/components/editor/sections/ResultsSection'
import CashFlowSection from '@/components/editor/sections/CashFlowSection'
import BalanceSection from '@/components/editor/sections/BalanceSection'
import FinancingSection from '@/components/editor/sections/FinancingSection'
import ProfitabilitySection from '@/components/editor/sections/ProfitabilitySection'
import SyntheseSection from '@/components/editor/sections/SyntheseSection'
import ExportSection from '@/components/editor/sections/ExportSection'

const VALID_SECTIONS: EditorSection[] = [
  'entreprise', 'products', 'materials', 'staff', 'expenses', 'investments',
  'funding', 'results', 'cashflow', 'balance', 'profitability', 'financing',
  'synthese', 'export',
]
const sectionStorageKey = (companyId: string) => `activeSection:${companyId}`

export default function EditorPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isOnline = useNetworkStore((s) => s.isOnline)
  const syncInProgress = useNetworkStore((s) => s.syncInProgress)
  const reconnecting = useNetworkStore((s) => s.reconnecting)

  const company = useCompanyStore((s) => s.company)
  const role = safeRole(user?.role)
  const isValidated = company?.isValidated ?? false
  const isOwner = !!(user && company?.createdBy?.id === user.id)
  const userCanEditValidated = canEditValidated(role)
  const userCanEditNonValidated = canEditNonValidated(role)
  const readOnly = !!(user && (
    (isValidated && !userCanEditValidated) ||
    (!isValidated && !userCanEditNonValidated && !isOwner)
  ))
  const activeSection = useCompanyStore((s) => s.activeSection)
  const setCompany = useCompanyStore((s) => s.setCompany)
  const resetCompany = useCompanyStore((s) => s.resetCompany)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const loadCompany = useCallback(async () => {
    if (!companyId) return
    const id = Number(companyId)
    setApiError(null)

    if (isOnline) {
      try {
        const data = await companyApi.get(id)
        setCompany(data)
        // Mettre en cache pour usage offline ultérieur
        await syncService.saveCompanyCache(data)
        setOfflineMode(false)
        return
      } catch (err: unknown) {
        // 403 = accès vraiment interdit (non propriétaire d'un BP non validé)
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
          navigate('/', { replace: true })
          return
        }
        const msg = err instanceof Error ? err.message : 'Erreur serveur'
        setApiError(msg)
        const cached = await syncService.loadCompanyCache(id)
        if (cached) {
          setCompany(cached)
        }
        return
      }
    }

    // Vraiment hors-ligne : charger depuis IndexedDB
    const cached = await syncService.loadCompanyCache(id)
    if (cached) {
      setCompany(cached)
      setOfflineMode(true)
    } else {
      // Pas de cache disponible → retour au dashboard
      navigate('/', { replace: true })
    }
  }, [companyId, isOnline, setCompany, navigate])

  useEffect(() => {
    loadCompany()
    return () => resetCompany()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    const saved = sessionStorage.getItem(sectionStorageKey(companyId))
    if (saved && VALID_SECTIONS.includes(saved as EditorSection)) {
      useCompanyStore.getState().setActiveSection(saved as EditorSection)
    }
  }, [companyId])

  useEffect(() => {
    if (companyId) sessionStorage.setItem(sectionStorageKey(companyId), activeSection)
  }, [companyId, activeSection])

  useEffect(() => {
    if (isOnline && !syncInProgress && !reconnecting && offlineMode && companyId) {
      loadCompany()
    }
  }, [isOnline, syncInProgress, reconnecting]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!company) {
    return (
      <div className="app-layout">
        <EditorSidebar companyName="Chargement…" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <div className="mobile-topbar">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
              <i className="fas fa-bars" />
            </button>
            <img src="/logo-aides.png" alt="AIDES" style={{ height: 32 }} />
          </div>
          <div className="loading-overlay">
            <div className="spinner" />
            {isOnline ? "Chargement de l'entreprise…" : 'Chargement depuis le cache…'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <EditorSidebar companyName={company.name} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <i className="fas fa-bars" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.name}
          </span>
          {user && <span style={{ ...styles.userChip, marginLeft: 'auto' }}>{user.initials}</span>}
        </div>

        {/* Top bar */}
        <div style={styles.topBar}>
          {/* Gauche */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/')}
          >
            <i
              className="fas fa-arrow-left"
              style={{ marginRight: 6, fontSize: 11 }}
            />
            Tableau de bord
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Droite */}
          <div style={styles.rightSection}>
            {/* Infos entreprise */}
            <div style={styles.companyInfo}>
              <h2 style={styles.companyName}>{company.name}</h2>

              {company.promoteur && (
                <span style={styles.sector}>
                  <i className="fas fa-user" style={{ marginRight: 5, fontSize: 10 }} />
                  {company.promoteur}
                </span>
              )}

              {company.secteur && (
                <span style={styles.sector}>
                  <i
                    className="fas fa-tag"
                    style={{ marginRight: 5, fontSize: 10 }}
                  />
                  {company.secteur}
                </span>
              )}
            </div>

            <SyncIndicator />
          </div>
        </div>

        {/* Bannière mode offline — uniquement si vraiment sans réseau */}
        {offlineMode && !apiError && (
          <div style={styles.offlineBanner}>
            <i className="fas fa-database" style={{ marginRight: 8 }} />
            Vérifier votre connexion internet
          </div>
        )}

        {/* Bannière erreur serveur (500, DB…) — en ligne mais API en erreur */}
        {apiError && (
          <div style={styles.errorBanner}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
            Erreur serveur : {apiError}. Vérifier votre connexion internet
          </div>
        )}

        {/* Bannière lecture seule */}
        {readOnly && (
          <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 16px', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-lock" style={{ color: '#b45309', fontSize: 16 }} />
            <span style={{ fontSize: 'var(--text-sm)', color: '#92400e', fontWeight: 500 }}>
              Mode visualisation - vous pouvez consulter les données mais pas les modifier.
            </span>
          </div>
        )}

        {/* Section content */}
        <div style={{ marginTop: 'var(--space-6)', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.75 : 1 }}>
          {activeSection === 'entreprise'    && <SettingsSection />}
          {activeSection === 'products'       && <ProductsSection />}
          {activeSection === 'materials'      && <MaterialsSection />}
          {activeSection === 'staff'          && <StaffSection />}
          {activeSection === 'expenses'       && <ExpensesSection />}
          {activeSection === 'investments'    && <InvestmentsSection />}
          {activeSection === 'funding'        && <FundingSection />}
          {activeSection === 'results'        && <ResultsSection />}
          {activeSection === 'cashflow'       && <CashFlowSection />}
          {activeSection === 'balance'        && <BalanceSection />}
          {activeSection === 'profitability'  && <ProfitabilitySection />}
          {activeSection === 'financing'      && <FinancingSection />}
          {activeSection === 'synthese'       && <SyntheseSection />}
          {activeSection === 'export'         && canExport(role) && <ExportSection />}
          {activeSection === 'export'         && !canExport(role) && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              <i className="fas fa-lock" style={{ fontSize: 40, marginBottom: 16, display: 'block' }} />
              <p style={{ fontWeight: 600 }}>Accès réservé aux administrateurs</p>
              <p style={{ fontSize: 'var(--text-sm)' }}>Seuls les admins peuvent exporter les données en Excel.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
    marginBottom: 0,
    gap: 'var(--space-3)',
  },
  companyInfo: { flex: 1, minWidth: 0 },
  companyName: { fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sector: { display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 4, padding: '2px 8px', marginTop: 4 },
  offlineBanner: { background: '#1e3a5f', color: '#93c5fd', borderRadius: 8, padding: '10px 16px', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center' },
  errorBanner: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center' },
}
