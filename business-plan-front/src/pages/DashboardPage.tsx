import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, companyApi } from '@/api/api'
import { syncService } from '@/services/syncService'
import { useNetworkStore } from '@/stores/networkStore'
import { useAuthStore } from '@/stores/authStore'
import SyncIndicator from '@/components/ui/SyncIndicator'
import AppSidebar from '@/components/layout/AppSidebar'
import ProjectCard from '@/components/dashboard/ProjectCard'
import CreateProjectModal from '@/components/dashboard/CreateProjectModal'
import CreateCompanyModal from '@/components/dashboard/CreateCompanyModal'
import type { ProjectSummary } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isOnline = useNetworkStore((s) => s.isOnline)
  const syncInProgress = useNetworkStore((s) => s.syncInProgress)
  const reconnecting = useNetworkStore((s) => s.reconnecting)

  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [createCompanyForProjectId, setCreateCompanyForProjectId] = useState<number | null>(null)

  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')

  const loadProjects = useCallback(async () => {
    if (isOnline) {
      try {
        const data = await projectApi.list()
        setProjects(data)
        setIsOfflineMode(false)
        await syncService.saveDashboardCache(data)
        setIsLoading(false)
        return
      } catch {
        
      }
    }
    const cached = await syncService.loadDashboardCache()
    if (cached) {
      setProjects(cached)
      setIsOfflineMode(true)
    } else {
      setError('Pas de connexion et aucune donnée en cache.')
    }
    setIsLoading(false)
  }, [isOnline])

  
  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    if (isOnline && !syncInProgress && !reconnecting && isOfflineMode) {
      loadProjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, syncInProgress, reconnecting])

  async function handleDeleteProject(projectId: number) {
    if (!confirm('Supprimer ce projet et toutes ses entreprises ?')) return
    await projectApi.delete(projectId)
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  async function handleDeleteCompany(companyId: number, projectId: number) {
    if (!confirm('Supprimer cette entreprise et toutes ses données ?')) return
    await companyApi.delete(companyId)
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, companies: p.companies.filter((c) => c.id !== companyId), companyCount: p.companyCount - 1 }
          : p,
      ),
    )
  }

  async function handleDuplicateCompany(companyId: number, projectId: number) {
    const copy = await companyApi.duplicate(companyId)
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, companies: [...p.companies, copy], companyCount: p.companyCount + 1 }
          : p,
      ),
    )
  }

  function handleOpenEditor(companyId: number) {
    navigate(`/editor/${companyId}`)
  }

  async function handleValidateCompany(companyId: number) {
    const res = await companyApi.validate(companyId)
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        companies: p.companies.map((c) =>
          c.id === companyId
            ? { ...c, isValidated: true, validatedAt: res.validatedAt, validatedBy: res.validatedBy }
            : c,
        ),
      })),
    )
  }

  async function handleUnvalidateCompany(companyId: number) {
    await companyApi.unvalidate(companyId)
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        companies: p.companies.map((c) =>
          c.id === companyId
            ? { ...c, isValidated: false, validatedAt: null, validatedBy: null }
            : c,
        ),
      })),
    )
  }

  return (
    <div className="app-layout">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <i className="fas fa-bars" />
          </button>
          <img src="/logo-aides.png" alt="AIDES" style={{ height: 32 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              Bonjour, {user?.firstName ?? 'Miavaka'} 👋
            </h2>
            <p className="section-subtitle">Gérez vos projets et entreprises ici.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <SyncIndicator />
            {/* Toggle vue carte / tableau */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('card')}
                title="Vue carte"
                style={{
                  padding: '6px 10px', border: 'none', cursor: 'pointer',
                  background: viewMode === 'card' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: viewMode === 'card' ? '#fff' : 'var(--color-text-muted)',
                  transition: 'background 0.15s',
                }}
              >
                <i className="fas fa-th-large" style={{ fontSize: 13 }} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Vue tableau"
                style={{
                  padding: '6px 10px', border: 'none', borderLeft: '1px solid var(--color-border)', cursor: 'pointer',
                  background: viewMode === 'table' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: viewMode === 'table' ? '#fff' : 'var(--color-text-muted)',
                  transition: 'background 0.15s',
                }}
              >
                <i className="fas fa-list" style={{ fontSize: 13 }} />
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateProject(true)}
              disabled={!isOnline}
              title={!isOnline ? 'Connexion requise pour créer un projet' : undefined}
            >
              + Nouveau projet
            </button>
          </div>
        </div>

        {/* Bannière mode offline */}
        {isOfflineMode && (
          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: '#fffbeb', border: '1px solid #f5a623', borderRadius: 'var(--radius)', color: '#92400e', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-database" />
            Mode hors-ligne affichage du cache local. Reconnectez-vous pour voir les dernières modifications.
          </div>
        )}

        {/* Error */}
        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* Loading */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            Chargement des projets…
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">Aucun projet</div>
            <p className="empty-state-desc">Créez votre premier projet pour commencer.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => setShowCreateProject(true)}
            >
              + Créer un projet
            </button>
          </div>
        )}

        {/* Projects list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              onOpenEditor={handleOpenEditor}
              onDeleteProject={() => handleDeleteProject(project.id)}
              onAddCompany={() => setCreateCompanyForProjectId(project.id)}
              onDeleteCompany={(id) => handleDeleteCompany(id, project.id)}
              onDuplicateCompany={(id) => handleDuplicateCompany(id, project.id)}
              onValidateCompany={handleValidateCompany}
              onUnvalidateCompany={handleUnvalidateCompany}
            />
          ))}
        </div>

        {/* Modal création projet */}
        {showCreateProject && (
          <CreateProjectModal
            onClose={() => setShowCreateProject(false)}
            onCreated={(newProject) => {
              setProjects((prev) => [...prev, newProject])
              setShowCreateProject(false)
            }}
          />
        )}

        {/* Modal création entreprise */}
        {createCompanyForProjectId !== null && (
          <CreateCompanyModal
            projectId={createCompanyForProjectId}
            onClose={() => setCreateCompanyForProjectId(null)}
            onCreated={(newCompany) => {
              setProjects((prev) =>
                prev.map((p) =>
                  p.id === createCompanyForProjectId
                    ? { ...p, companies: [...p.companies, newCompany], companyCount: p.companyCount + 1 }
                    : p
                )
              )
              setCreateCompanyForProjectId(null)
            }}
          />
        )}
      </main>
    </div>
  )
}
