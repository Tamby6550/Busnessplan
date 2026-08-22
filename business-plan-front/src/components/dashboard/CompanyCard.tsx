import type { CompanySummary } from '@/types'
import { formatAriary } from '@/calculations/calculations'
import { useAuthStore } from '@/stores/authStore'
import { canSeeAll, canValidate, safeRole } from '@/utils/permissions'

interface Props {
  company: CompanySummary
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
  onValidate?: () => void
  onUnvalidate?: () => void
}


function KpiCell({ label, value, signed }: { label: string; value: string; signed?: number }) {
  const color = signed !== undefined
    ? signed > 0 ? '#1D9E75' : signed < 0 ? '#E24B4A' : 'var(--color-text)'
    : 'var(--color-text)'
  return (
    <div style={{ padding: '8px 14px', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

export default function CompanyCard({ company, onOpen, onDelete, onDuplicate, onValidate, onUnvalidate }: Props) {
  const snap = company.snapshot
  const pct  = snap?.completionPct ?? 0
  const user = useAuthStore((s) => s.user)
  const role = safeRole(user?.role)
  const isAdmin = role === 'admin'
  const userCanSeeAll = canSeeAll(role)
  const userCanValidate = canValidate(role)

  const validated  = company.isValidated
  const locked     = validated && !userCanSeeAll
  const isMyCompany = company.createdBy?.id === user?.id

  const progressColor = validated ? '#E24B4A' : pct === 100 ? '#1D9E75' : '#378ADD'

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: validated ? '1.5px solid #E24B4A' : '0.5px solid var(--color-border)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: locked ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s',
      }}
      onClick={locked ? undefined : onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !locked && onOpen()}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 14px 10px' }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 500, fontSize: 15,
          background: validated ? '#FCEBEB' : '#E6F1FB',
          color: validated ? '#A32D2D' : '#185FA5',
        }}>
          {company.name.charAt(0).toUpperCase()}
        </div>

        {/* Nom + secteur — prend tout l'espace restant */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {company.name}
            </div>
            {isMyCompany && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                Moi
              </span>
            )}
          </div>
          {company.secteur && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
              {company.secteur}
            </div>
          )}
        </div>

        {/* Colonne droite : badge + boutons icônes, ne déborde jamais sur le nom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {/* Badge validé */}
          {validated && (
            <span style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <i className="fas fa-check-circle" style={{ fontSize: 10 }} />
              Validé
            </span>
          )}
          {/* Boutons action : icônes compacts */}
          <div style={{ display: 'flex', gap: 2 }}>
            {userCanValidate && !validated && (
              <button
                className="btn btn-ghost btn-sm"
                title="Valider"
                style={{ fontSize: 13, color: '#0F6E56', padding: '3px 6px', border: '0.5px solid #5DCAA5', borderRadius: 6 }}
                onClick={onValidate}
              >
                <i className="fas fa-check" />
              </button>
            )}
            {/* Dévalider : uniquement celui qui a validé (admin ou manager) */}
            {userCanValidate && validated && company.validatedBy?.id === user?.id && (
              <button
                className="btn btn-ghost btn-sm"
                title="Dévalider"
                style={{ fontSize: 13, color: '#A32D2D', padding: '3px 6px', border: '0.5px solid #F09595', borderRadius: 6 }}
                onClick={onUnvalidate}
              >
                <i className="fas fa-lock-open" />
              </button>
            )}
            {(isAdmin || !validated) && (
              <>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-muted)', fontSize: 13 }} title="Dupliquer" onClick={onDuplicate}>⎘</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: 13 }} title="Supprimer" onClick={onDelete}>🗑</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Séparateur ── */}
      <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '0 14px' }} />

      {/* ── Progression ── */}
      <div style={{ padding: '10px 14px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Complétion</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text)' }}>{pct} %</span>
        </div>
        <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: progressColor, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* ── KPIs ── */}
      {snap ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '0.5px solid var(--color-border)', gap: '0.5px', background: 'var(--color-border)' }}>
          <KpiCell label="CA An 1"    value={formatAriary(snap.revenueY1)} />
          <KpiCell label="Résultat"   value={formatAriary(snap.netIncomeY1)} signed={snap.netIncomeY1} />
          <KpiCell label="Tréso cum." value={formatAriary(snap.cashCumY1)}  signed={snap.cashCumY1} />
        </div>
      ) : (
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Aucune donnée saisie
        </div>
      )}

      {/* ── Footer ── */}
      {(company.promoteur || company.lastModifiedBy || company.validatedBy) && (
        <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
          {company.promoteur && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              <i className="fas fa-user" style={{ fontSize: 10, marginRight: 4 }} />
              {company.promoteur}
            </span>
          )}
          {company.validatedBy && (
            <span style={{ fontSize: 11, color: '#A32D2D' }}>
              <i className="fas fa-check-circle" style={{ fontSize: 10, marginRight: 4 }} />
              Validé par <strong style={{ fontWeight: 500 }}>{company.validatedBy.fullName}</strong>
            </span>
          )}
          {company.lastModifiedBy && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              <i className="fas fa-pencil-alt" style={{ fontSize: 10, marginRight: 4 }} />
              Modifié par <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>{company.lastModifiedBy.fullName.split(' ')[0]}</strong>
              {' · '}
              {new Date(company.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {/* ── Notice accès (validé) ── */}
      {validated && !isAdmin && (
        <div style={{
          padding: '7px 14px',
          borderTop: '0.5px solid var(--color-border)',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: userCanSeeAll ? '#E6F1FB' : '#FCEBEB',
          color: userCanSeeAll ? '#185FA5' : '#A32D2D',
        }}>
          <i className={`fas fa-${userCanSeeAll ? "eye" : "lock"}`} style={{ fontSize: 12, marginRight: 2 }} />
          {userCanSeeAll ? "Lecture seule - entreprise validée" : "Accès restreint - entreprise validée"}
        </div>
      )}
    </div>
  )
}
