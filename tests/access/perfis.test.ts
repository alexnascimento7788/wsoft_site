import fs from 'fs'
import path from 'path'
import type { Access, CollectionConfig, FieldAccess, GlobalConfig, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  canAccessCrm,
  canAccessCrmUser,
  getRoles,
  hideFromNonBudget,
  hideFromNonCrmAdmins,
  isCrmAdmin,
  legacyRoleFor,
  type Role,
} from '@/access/roles'
import { CentrosDeCusto } from '@/collections/Orcamento/CentrosDeCusto'
import { Contas } from '@/collections/Orcamento/Contas'
import { Despesas } from '@/collections/Orcamento/Despesas'
import { Fornecedores } from '@/collections/Orcamento/Fornecedores'
import { Users } from '@/collections/Users'
import { ConfiguracaoOrcamento } from '@/globals/ConfiguracaoOrcamento'

type FakeUser = { id: number; roles?: Role[]; role?: 'admin' | 'financeiro' | 'consulta' }

const usuario = (roles: Role[], id = 10): FakeUser => ({ id, roles })
const req = (user: FakeUser | null) => ({ req: { user } }) as unknown as Parameters<Access>[0]

const permite = (access: Access | undefined, user: FakeUser | null) => {
  if (!access) throw new Error('access não definido')
  return access(req(user))
}

const ORCAMENTO: CollectionConfig[] = [CentrosDeCusto, Contas, Despesas, Fornecedores]
const OPERACOES = ['read', 'create', 'update', 'delete'] as const

const SO_CRM: Role[][] = [['crm_admin'], ['vendedor'], ['apresentador'], ['vendedor', 'apresentador']]

describe('perfis — orçamento', () => {
  it('admin e financeiro fazem tudo no orçamento', () => {
    for (const roles of [['admin'], ['financeiro']] as Role[][]) {
      for (const col of ORCAMENTO) {
        for (const op of OPERACOES) expect(permite(col.access?.[op], usuario(roles))).toBe(true)
      }
      expect(permite(ConfiguracaoOrcamento.access?.read, usuario(roles))).toBe(true)
      expect(permite(ConfiguracaoOrcamento.access?.update, usuario(roles))).toBe(true)
    }
  })

  it('consulta só lê o orçamento', () => {
    for (const col of ORCAMENTO) {
      expect(permite(col.access?.read, usuario(['consulta']))).toBe(true)
      for (const op of ['create', 'update', 'delete'] as const) {
        expect(permite(col.access?.[op], usuario(['consulta']))).toBe(false)
      }
    }
    expect(permite(ConfiguracaoOrcamento.access?.update, usuario(['consulta']))).toBe(false)
  })

  it.each(SO_CRM)('perfil de CRM (%s) não lê nem altera o orçamento', (...roles) => {
    for (const col of ORCAMENTO) {
      for (const op of OPERACOES) expect(permite(col.access?.[op], usuario(roles))).toBe(false)
    }
    expect(permite(ConfiguracaoOrcamento.access?.read, usuario(roles))).toBe(false)
    expect(permite(ConfiguracaoOrcamento.access?.update, usuario(roles))).toBe(false)
  })

  it('sem login ou sem perfil não acessa nada', () => {
    for (const user of [null, usuario([])]) {
      for (const col of ORCAMENTO) expect(permite(col.access?.read, user)).toBe(false)
      expect(permite(ConfiguracaoOrcamento.access?.read, user)).toBe(false)
    }
  })

  it('menu do orçamento fica escondido para perfis só de CRM', () => {
    const hidden = (ORCAMENTO[0].admin?.hidden ?? (() => false)) as typeof hideFromNonBudget
    expect(hidden({ user: usuario(['vendedor']) as never })).toBe(true)
    expect(hidden({ user: usuario(['financeiro']) as never })).toBe(false)
    expect((ConfiguracaoOrcamento as GlobalConfig).admin?.hidden).toBe(hideFromNonBudget)
  })
})

describe('perfis — CRM', () => {
  it('financeiro e consulta não entram no CRM', () => {
    for (const roles of [['financeiro'], ['consulta'], ['financeiro', 'consulta']] as Role[][]) {
      expect(canAccessCrmUser(usuario(roles))).toBe(false)
      expect(permite(canAccessCrm, usuario(roles))).toBe(false)
      expect(permite(isCrmAdmin, usuario(roles))).toBe(false)
    }
  })

  it('perfis do CRM entram; só admin e crm_admin administram', () => {
    for (const roles of SO_CRM) expect(permite(canAccessCrm, usuario(roles))).toBe(true)
    expect(permite(isCrmAdmin, usuario(['admin']))).toBe(true)
    expect(permite(isCrmAdmin, usuario(['crm_admin']))).toBe(true)
    expect(permite(isCrmAdmin, usuario(['vendedor', 'apresentador']))).toBe(false)
  })
})

describe('perfis — usuários', () => {
  const rolesField = Users.fields.find((f) => 'name' in f && f.name === 'roles') as SelectField
  const fieldUpdate = rolesField.access?.update as FieldAccess

  it('admin e crm_admin veem a equipe; os demais só o próprio cadastro', () => {
    expect(permite(Users.access?.read, usuario(['admin']))).toBe(true)
    expect(permite(Users.access?.read, usuario(['crm_admin']))).toBe(true)
    for (const roles of [['vendedor'], ['apresentador'], ['financeiro'], ['consulta']] as Role[][]) {
      expect(permite(Users.access?.read, usuario(roles, 7))).toEqual({ id: { equals: 7 } })
    }
  })

  it('só o admin cria, apaga e muda perfis', () => {
    expect(permite(Users.access?.create, usuario(['admin']))).toBe(true)
    expect(permite(Users.access?.create, usuario(['crm_admin']))).toBe(false)
    expect(permite(Users.access?.delete, usuario(['crm_admin']))).toBe(false)
    expect(fieldUpdate(req(usuario(['admin'])) as never)).toBe(true)
    expect(fieldUpdate(req(usuario(['crm_admin'])) as never)).toBe(false)
    expect(fieldUpdate(req(usuario(['vendedor'])) as never)).toBe(false)
  })

  it('menu de usuários só para admin e crm_admin', () => {
    expect(Users.admin?.hidden).toBe(hideFromNonCrmAdmins)
    expect(hideFromNonCrmAdmins({ user: usuario(['crm_admin']) as never })).toBe(false)
    expect(hideFromNonCrmAdmins({ user: usuario(['vendedor']) as never })).toBe(true)
  })

  it('admin não consegue remover o próprio perfil de administrador', () => {
    const validate = rolesField.validate as unknown as (v: unknown, o: unknown) => unknown
    const admin = usuario(['admin'], 1)
    expect(validate(['crm_admin'], { req: { user: admin }, id: 1 })).toMatch(/próprio perfil/)
    expect(validate(['admin', 'crm_admin'], { req: { user: admin }, id: 1 })).toBe(true)
    expect(validate(['vendedor'], { req: { user: admin }, id: 2 })).toBe(true)
    expect(validate([], { req: { user: admin }, id: 2 })).toMatch(/pelo menos um/)
  })
})

describe('perfis — compatibilidade com o perfil antigo', () => {
  it('usuário ainda sem "roles" usa o "role" antigo (admin atual não perde acesso)', () => {
    expect(getRoles({ role: 'admin' })).toEqual(['admin'])
    expect(permite(Despesas.access?.delete, { id: 1, role: 'admin' })).toBe(true)
    expect(permite(Despesas.access?.read, { id: 2, role: 'consulta' })).toBe(true)
  })

  it('a coluna antiga recebe o perfil equivalente', () => {
    expect(legacyRoleFor(['vendedor', 'admin'])).toBe('admin')
    expect(legacyRoleFor(['consulta', 'financeiro'])).toBe('financeiro')
    expect(legacyRoleFor(['vendedor', 'apresentador'])).toBe('consulta')

    const hook = Users.hooks!.beforeChange![0] as (a: { data: Record<string, unknown> }) => unknown
    expect(hook({ data: { roles: ['crm_admin'] } })).toMatchObject({ role: 'consulta' })
  })
})

describe('migrações', () => {
  const dir = path.resolve(__dirname, '../../src/migrations')
  const upDe = (arquivo: string) => {
    const texto = fs.readFileSync(path.join(dir, arquivo), 'utf-8')
    return texto.slice(texto.indexOf('export async function up'), texto.indexOf('export async function down'))
  }

  it('perfis: só acrescenta e copia o perfil atual de cada usuário', () => {
    const up = upDe('20261108_151454_perfis.ts')
    expect(up).not.toMatch(/\bDROP\b|ALTER COLUMN|DELETE FROM|UPDATE "users"/i)
    expect(up).toMatch(/INSERT INTO "users_roles"[\s\S]*FROM "users"/)
  })

  it('bloqueio da API REST: não altera estrutura', () => {
    const up = upDe('20261108_151500_bloquear_api_rest.ts')
    expect(up).not.toMatch(/\bDROP\b|ADD COLUMN|ALTER COLUMN|DELETE FROM/i)
    expect(up).toMatch(/ENABLE ROW LEVEL SECURITY/)
    expect(up).toMatch(/REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated/)
  })
})
