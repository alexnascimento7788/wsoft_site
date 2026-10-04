import type { Access, ClientUser, FieldAccess, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

export type Role = 'admin' | 'financeiro' | 'consulta'

type MaybeUser = Pick<User, 'role'> | PayloadRequest['user'] | ClientUser | undefined

// Usuários criados antes dos perfis existirem não têm `role` — tratados como admin.
export const getRole = (user: MaybeUser): Role | null => {
  if (!user) return null
  return ((user as { role?: Role | null }).role ?? 'admin') as Role
}

export const isAdminUser = (user: MaybeUser) => getRole(user) === 'admin'

export const canEditBudgetUser = (user: MaybeUser) => {
  const role = getRole(user)
  return role === 'admin' || role === 'financeiro'
}

export const canReadBudgetUser = (user: MaybeUser) => getRole(user) !== null

// Access functions (collections / globals)
export const isAdmin: Access = ({ req }) => isAdminUser(req.user)
export const canEditBudget: Access = ({ req }) => canEditBudgetUser(req.user)
export const canReadBudget: Access = ({ req }) => canReadBudgetUser(req.user)

export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdminUser(req.user)) return true
  return { id: { equals: req.user.id } }
}

// Field access
export const isAdminField: FieldAccess = ({ req }) => isAdminUser(req.user)

// admin.hidden — esconde do menu quem não é admin
export const hideFromNonAdmins = ({ user }: { user: ClientUser | PayloadRequest['user'] }) =>
  !isAdminUser(user)
