export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | 'standard'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:    'Administrateur',
  manager:  'Manager',
  editor:   'Éditeur',
  viewer:   'Lecteur',
  standard: 'Standard',
}


export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:    'Accès complet, peut aussi créer et gérer les comptes utilisateurs.',
  manager:  'Voit toutes les données, peut modifier et valider les business plans.',
  editor:   'Voit toutes les données, peut modifier uniquement les business plans non encore validés.',
  viewer:   'Voit toutes les données (y compris les validées) mais ne peut rien modifier.',
  standard: "Peut créer son propre business plan et le modifier tant qu'il n'est pas validé.",
}


export const ROLE_ICONS: Record<UserRole, string> = {
  admin:    'fa-shield-alt',
  manager:  'fa-user-tie',
  editor:   'fa-pen',
  viewer:   'fa-eye',
  standard: 'fa-user',
}


export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin:    { bg: '#fef3c7', text: '#92400e' },
  manager:  { bg: '#ede9fe', text: '#5b21b6' },
  editor:   { bg: '#dbeafe', text: '#1e40af' },
  viewer:   { bg: '#dcfce7', text: '#166534' },
  standard: { bg: '#f1f5f9', text: '#475569' },
}

export function canSeeAll(role: UserRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'editor' || role === 'viewer'
}

export function canEditNonValidated(role: UserRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'editor'
}

export function canEditValidated(role: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function canValidate(role: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canExport(role: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Dupliquer un projet entier, ou copier une entreprise vers un autre projet.
 * Réservé aux administrateurs et managers : ces actions recopient toutes les
 * entreprises d'un projet, y compris celles qu'un rôle plus restreint ne voit pas.
 * Le serveur applique la même règle — masquer le bouton ne suffit pas.
 */
export function canDuplicateProject(role: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function safeRole(role: string | undefined | null): UserRole {
  const valid: UserRole[] = ['admin', 'manager', 'editor', 'viewer', 'standard']
  return valid.includes(role as UserRole) ? (role as UserRole) : 'standard'
}
