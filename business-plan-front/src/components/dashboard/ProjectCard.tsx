import { useState, useMemo } from 'react'
import type { ProjectSummary, CompanySummary } from '@/types'
import CompanyCard from '@/components/dashboard/CompanyCard'
import ColumnFilterDropdown from '@/components/ui/ColumnFilterDropdown'
import RangeFilterDropdown, { type NumRange } from '@/components/ui/RangeFilterDropdown'
import { useAuthStore } from '@/stores/authStore'
import { canSeeAll, canValidate, safeRole } from '@/utils/permissions'
import { exportDashboardToExcel } from '@/utils/dashboardExport'

type FilterKey = 'entreprise' | 'secteur' | 'promoteur' | 'creePar' | 'statut'
type Filters = Record<FilterKey, Set<string> | null>

const EMPTY_FILTERS: Filters = { entreprise: null, secteur: null, promoteur: null, creePar: null, statut: null}

function normalize(v: string | null | undefined): string {
  return v && v.trim() !== '' ? v : '(Vide)'
}

interface Props {
  project: ProjectSummary
  viewMode: 'card' | 'table'
  onDeleteProject: () => void
  onAddCompany: () => void
  onDeleteCompany: (companyId: number) => void
  onDuplicateCompany: (companyId: number) => void
  onOpenEditor: (companyId: number) => void
  onValidateCompany: (companyId: number) => void
  onUnvalidateCompany: (companyId: number) => void
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }

const styles = {
  meta: {
    display: 'flex', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 600,
    textDecoration: 'underline',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 'var(--space-4)',
  } as React.CSSProperties,
}

export default function ProjectCard({
  project,
  viewMode,
  onDeleteProject,
  onAddCompany,
  onDeleteCompany,
  onDuplicateCompany,
  onOpenEditor,
  onValidateCompany,
  onUnvalidateCompany,
}: Props) {
  const user = useAuthStore((s) => s.user)
  const role = safeRole(user?.role)
  const isAdmin = role === 'admin'
  const userCanSeeAll = canSeeAll(role)
  const userCanValidate = canValidate(role)

  const [isOpen, setIsOpen] = useState(true)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [completionFilter, setCompletionFilter] = useState<NumRange | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const visibleCompanies = project.companies.filter((c: CompanySummary) => {
    if (userCanSeeAll) return true
    // Standard : voit seulement ses propres entreprises non validées
    return c.createdBy?.id === user?.id && !c.isValidated
  })

  async function handleExportProject() {
    setIsExporting(true)
    try {
      const { skipped } = await exportDashboardToExcel([project], user?.id, role, undefined, project.name)
      if (skipped.length > 0) {
        alert(
          `Export terminé, mais ${skipped.length} entreprise(s) n'ont pas pu être incluses :\n` +
          skipped.map((s) => `- ${s.name} (${s.reason})`).join('\n'),
        )
      }
    } catch {
      alert("Une erreur est survenue pendant l'export Excel de ce projet.")
    } finally {
      setIsExporting(false)
    }
  }

  const noPermission = !userCanSeeAll

  const statutOf = (c: CompanySummary) => (c.isValidated ? 'Validé' : 'En cours')
  const creeParOf = (c: CompanySummary) => normalize(c.createdBy?.fullName)

  const filteredCompanies = useMemo(() => {
    return visibleCompanies.filter((c) => {
      if (filters.entreprise && !filters.entreprise.has(normalize(c.name))) return false
      if (filters.secteur && !filters.secteur.has(normalize(c.secteur))) return false
      if (filters.promoteur && !filters.promoteur.has(normalize(c.promoteur))) return false
      if (filters.creePar && !filters.creePar.has(creeParOf(c))) return false
      if (filters.statut && !filters.statut.has(statutOf(c))) return false
      if (completionFilter) {
        const pct = c.snapshot?.completionPct ?? 0
        if (pct < completionFilter.min || pct > completionFilter.max) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCompanies, filters, completionFilter])

  const hasActiveFilters = Object.values(filters).some((f) => f !== null) || completionFilter !== null

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setCompletionFilter(null)
  }

  return (
    <div className="card">
      {/* Project header — cliquable pour ouvrir/fermer */}
      <div
        className="card-header"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {/* Chevron accordéon */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--color-surface-2)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}>
            <i className="fas fa-chevron-down" style={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
          </span>
          <div>
            <div className="card-title">{project.name}</div>
            {project.description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {project.description}
              </p>
            )}
            <div style={styles.meta}>
              <span>{project.companyCount} entreprise{project.companyCount !== 1 ? 's' : ''}</span>
              {project.createdBy && <span>· Créé par {project.createdBy.fullName}</span>}
              {!isOpen && visibleCompanies.length > 0 && (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  · {visibleCompanies.length} masquée{visibleCompanies.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Boutons — stopPropagation pour ne pas toggler l'accordéon */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportProject}
            disabled={isExporting || visibleCompanies.length === 0}
            title="Exporter en Excel les entreprises de ce projet"
          >
            {isExporting ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Export…
              </>
            ) : (
              <>
                <i className="fas fa-file-excel" style={{ marginRight: 6 }} />
                Export Excel
              </>
            )}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onAddCompany}>
            + Nouveau entreprise
          </button>
          {isAdmin && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)', padding: '4px 10px' }}
              onClick={onDeleteProject}
              title="Supprimer le projet"
            >
              <i className="fas fa-trash-can" style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>

      {/* Body — masqué si le projet est réduit */}
      {isOpen && (
        <div className="card-body">
          {visibleCompanies.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🏢</div>
              {noPermission ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  Vous n'avez pas encore d'entreprise dans ce projet.{' '}
                  <button style={styles.linkBtn} onClick={onAddCompany}>Créer la mienne</button>
                </p>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  Aucune entreprise dans ce projet.{' '}
                  <button style={styles.linkBtn} onClick={onAddCompany}>Créer la première</button>
                </p>
              )}
            </div>
          ) : (
            <>
              {noPermission && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-info-circle" style={{ color: 'var(--color-primary)' }} />
                  Seules vos entreprises non validées sont affichées.
                </div>
              )}

              {hasActiveFilters && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', marginBottom: 12, padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-filter" />
                    {filteredCompanies.length} / {visibleCompanies.length} entreprise{visibleCompanies.length > 1 ? 's' : ''} affichée{filteredCompanies.length > 1 ? 's' : ''} (filtres actifs)
                  </span>
                  <button style={styles.linkBtn} onClick={resetFilters}>Réinitialiser les filtres</button>
                </div>
              )}

              {filteredCompanies.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🔍</div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    Aucune entreprise ne correspond aux filtres.{' '}
                    <button style={styles.linkBtn} onClick={resetFilters}>Réinitialiser</button>
                  </p>
                </div>
              ) : (
              <>
              {/* ── Vue CARTE ── */}
              {viewMode === 'card' && (
                <div style={styles.grid}>
                  {filteredCompanies.map((company: CompanySummary) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onOpen={() => onOpenEditor(company.id)}
                      onDelete={() => onDeleteCompany(company.id)}
                      onDuplicate={() => onDuplicateCompany(company.id)}
                      onValidate={userCanValidate ? () => onValidateCompany(company.id) : undefined}
                      onUnvalidate={userCanValidate ? () => onUnvalidateCompany(company.id) : undefined}
                    />
                  ))}
                </div>
              )}

              {/* ── Vue TABLEAU ── */}
              {viewMode === 'table' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: 900 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={th}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Entreprise
                            <ColumnFilterDropdown
                              label="Entreprise"
                              values={visibleCompanies.map((c) => normalize(c.name))}
                              selected={filters.entreprise}
                              onChange={(sel) => setFilters((prev) => ({ ...prev, entreprise: sel }))}
                            />
                          </span>
                        </th>
                        <th style={th}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Secteur
                            <ColumnFilterDropdown
                              label="Secteur"
                              values={visibleCompanies.map((c) => normalize(c.secteur))}
                              selected={filters.secteur}
                              onChange={(sel) => setFilters((prev) => ({ ...prev, secteur: sel }))}
                            />
                          </span>
                        </th>
                        <th style={th}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Promoteur
                            <ColumnFilterDropdown
                              label="Promoteur"
                              values={visibleCompanies.map((c) => normalize(c.promoteur))}
                              selected={filters.promoteur}
                              onChange={(sel) => setFilters((prev) => ({ ...prev, promoteur: sel }))}
                            />
                          </span>
                        </th>
                        <th style={{ ...th, textAlign: 'right' }}>CA An 1</th>
                        <th style={{ ...th, textAlign: 'right' }}>Résultat</th>
                        <th style={{ ...th, textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Complétion
                            <RangeFilterDropdown
                              label="Complétion"
                              min={0}
                              max={100}
                              suffix=" %"
                              selected={completionFilter}
                              onChange={setCompletionFilter}
                            />
                          </span>
                        </th>
                        <th style={th}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Créé par
                            <ColumnFilterDropdown
                              label="Créé par"
                              values={visibleCompanies.map(creeParOf)}
                              selected={filters.creePar}
                              onChange={(sel) => setFilters((prev) => ({ ...prev, creePar: sel }))}
                            />
                          </span>
                        </th>
                        <th style={th}>Modifié par</th>
                        <th style={th}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Statut
                            <ColumnFilterDropdown
                              label="Statut"
                              values={visibleCompanies.map(statutOf)}
                              selected={filters.statut}
                              onChange={(sel) => setFilters((prev) => ({ ...prev, statut: sel }))}
                            />
                          </span>
                        </th>
                        <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((company: CompanySummary) => {
                        const snap    = company.snapshot
                        const pct     = snap?.completionPct ?? 0
                        const ni      = snap?.netIncomeY1 ?? 0
                        const initial = company.name.charAt(0).toUpperCase()
                        const colors  = ['#3a7d2e','#1e6bb8','#e67e22','#8e44ad','#16a085','#c0392b']
                        const avatarBg = colors[company.name.charCodeAt(0) % colors.length]
                        const isValidated = company.isValidated
                        const isMyCompany = company.createdBy?.id === user?.id
                        const modifiedDate = company.updatedAt
                          ? new Date(company.updatedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
                          : '—'
                        return (
                          <tr
                            key={company.id}
                            style={{
                              borderBottom: '1px solid var(--color-border)',
                              background: isValidated ? '#fff5f5' : undefined,
                              cursor: 'pointer',
                            }}
                            onDoubleClick={() => onOpenEditor(company.id)}
                          >
                            {/* Entreprise */}
                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                  {initial}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600 }}>{company.name}</span>
                                  {isMyCompany && (
                                    <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                                      Moi
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Secteur */}
                            <td style={{ ...td, color: 'var(--color-text-muted)', fontSize: 12 }}>
                              {company.secteur ?? '—'}
                            </td>
                            {/* Promoteur */}
                            <td style={{ ...td, color: 'var(--color-text-muted)', fontSize: 12 }}>
                              {company.promoteur ?? '—'}
                            </td>
                            {/* CA An 1 */}
                            <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                              {snap ? snap.revenueY1.toLocaleString('fr') + ' Ar' : '—'}
                            </td>
                            {/* Résultat */}
                            <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: ni >= 0 ? '#1D9E75' : '#E24B4A' }}>
                              {snap ? ni.toLocaleString('fr') + ' Ar' : '—'}
                            </td>
                            {/* Complétion */}
                            <td style={{ ...td, textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                <div style={{ width: 70, height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: isValidated ? '#E24B4A' : pct === 100 ? '#1D9E75' : 'var(--color-primary)', borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28 }}>{pct}%</span>
                              </div>
                            </td>
                            {/* Créé par */}
                            <td style={{ ...td, fontSize: 12 }}>
                              {company.createdBy ? (
                                <div style={{ fontWeight: 600 }}>{company.createdBy.fullName.split(' ')[0]}</div>
                              ) : '—'}
                            </td>
                            {/* Modifié par */}
                            <td style={{ ...td, fontSize: 12 }}>
                              {company.lastModifiedBy ? (
                                <div>
                                  <div style={{ fontWeight: 600 }}>{company.lastModifiedBy.fullName.split(' ')[0]}</div>
                                  <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{modifiedDate}</div>
                                </div>
                              ) : '—'}
                            </td>
                            {/* Statut */}
                            <td style={td}>
                              {isValidated ? (
                                <div>
                                  <div style={{ color: '#E24B4A', fontWeight: 700, fontSize: 13 }}>Validé</div>
                                  {company.validatedBy && (
                                    <div style={{ color: '#E24B4A', fontSize: 11 }}>par {company.validatedBy.fullName}</div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>En cours</span>
                              )}
                            </td>
                            {/* Actions */}
                            <td style={{ ...td, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                                {userCanValidate && !isValidated && onValidateCompany && (
                                  <button
                                    style={{ background: 'none', border: 'none', color: '#1D9E75', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
                                    onClick={() => onValidateCompany(company.id)}
                                  >Valider</button>
                                )}
                                {userCanValidate && isValidated && onUnvalidateCompany && (
                                  <button
                                    style={{ background: 'none', border: 'none', color: '#E24B4A', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
                                    onClick={() => onUnvalidateCompany(company.id)}
                                  >Invalider</button>
                                )}
                                {(isAdmin || isMyCompany) && (
                                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => onDeleteCompany(company.id)} title="Supprimer">
                                    <i className="fas fa-trash-can" style={{ fontSize: 14 }} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
