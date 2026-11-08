import type { Access, ClientUser, FieldAccess, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

export const ROLES = [
  { value: 'admin', label: 'Administrador (acesso total)' },
  { value: 'financeiro', label: 'Orçamento — edita' },
  { value: 'consulta', label: 'Orçamento — só consulta' },
  { value: 'crm_admin', label: 'CRM — administrador' },
  { value: 'vendedor', label: 'CRM — vendedor (contato de triagem)' },
  { value: 'apresentador', label: 'CRM — apresentador (SiagWeb)' },
] as const

export type Role = (typeof ROLES)[number]['value']

// Coluna antiga `role` (um perfil só). Continua no banco para o código anterior seguir
// funcionando até ser promovido; o código atual só usa `roles`.
export type LegacyRole = 'admin' | 'financeiro' | 'consulta'

const BUDGET_EDIT: Role[] = ['admin', 'financeiro']
const BUDGET_READ: Role[] = ['admin', 'financeiro', 'consulta']
const CRM_ANY: Role[] = ['admin', 'crm_admin', 'vendedor', 'apresentador']
const CRM_ADMIN: Role[] = ['admin', 'crm_admin']

type MaybeUser =
  | Partial<Pick<User, 'role' | 'roles'>>
  | PayloadRequest['user']
  | ClientUser
  | null
  | undefined

export const getRoles = (user: MaybeUser): Role[] => {
  if (!user) return []
  const { roles, role } = user as { roles?: Role[] | null; role?: LegacyRole | null }
  if (Array.isArray(roles) && roles.length > 0) return roles
  // Antes da migração dos perfis: usa o perfil antigo. Sem nenhum perfil = sem acesso.
  return role ? [role] : []
}

export const hasRole = (user: MaybeUser, allowed: Role[]) =>
  getRoles(user).some((role) => allowed.includes(role))

export const isAdminUser = (user: MaybeUser) => hasRole(user, ['admin'])
export const canEditBudgetUser = (user: MaybeUser) => hasRole(user, BUDGET_EDIT)
export const canReadBudgetUser = (user: MaybeUser) => hasRole(user, BUDGET_READ)
export const canAccessCrmUser = (user: MaybeUser) => hasRole(user, CRM_ANY)
export const isCrmAdminUser = (user: MaybeUser) => hasRole(user, CRM_ADMIN)

// Valor gravado na coluna antiga a partir dos perfis novos
export const legacyRoleFor = (roles: Role[] | null | undefined): LegacyRole => {
  if (roles?.includes('admin')) return 'admin'
  if (roles?.includes('financeiro')) return 'financeiro'
  return 'consulta'
}

// Access functions (collections / globals)
export const isAdmin: Access = ({ req }) => isAdminUser(req.user)
export const canEditBudget: Access = ({ req }) => canEditBudgetUser(req.user)
export const canReadBudget: Access = ({ req }) => canReadBudgetUser(req.user)
export const canAccessCrm: Access = ({ req }) => canAccessCrmUser(req.user)
export const isCrmAdmin: Access = ({ req }) => isCrmAdminUser(req.user)

export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdminUser(req.user)) return true
  return { id: { equals: req.user.id } }
}

// crm_admin enxerga a equipe toda (para distribuir leads); os demais, só o próprio cadastro
export const canReadUsers: Access = ({ req }) => {
  if (!req.user) return false
  if (isCrmAdminUser(req.user)) return true
  return { id: { equals: req.user.id } }
}

// Field access
export const isAdminField: FieldAccess = ({ req }) => isAdminUser(req.user)

// admin.hidden — complemento visual; quem protege de fato é o access control acima
type HiddenArgs = { user: ClientUser | PayloadRequest['user'] }
export const hideFromNonAdmins = ({ user }: HiddenArgs) => !isAdminUser(user)
export const hideFromNonBudget = ({ user }: HiddenArgs) => !canReadBudgetUser(user)
export const hideFromNonCrmAdmins = ({ user }: HiddenArgs) => !isCrmAdminUser(user)
