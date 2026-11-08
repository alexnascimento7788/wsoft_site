import { Forbidden, ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { isCrmAdminUser } from '../../access/roles'
import { normalizarCnpj, normalizarTelefone, soDigitos } from '../../crm/importacao/normalizar'
import { criarCalculoPrioridade, type RegraPrioridade } from '../../crm/importacao/prioridade'
import { regraPrioridadePadrao } from '../../globals/CrmConfiguracao'

// Na criação, grava quem registrou (relação + nome)
export const preencherRegistradoPor: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && req.user) {
    data.registradoPor = req.user.id
    data.registradoPorNome = (req.user as { name?: string | null }).name || req.user.email
  }
  return data
}

type LinhaTelefone = { numero?: string | null; tipo?: string | null; valido?: boolean | null }
type LinhaCnae = { codigo?: string | null; principal?: boolean | null }

const erro = (path: string, message: string) => new ValidationError({ errors: [{ message, path }] })

// Empresa cadastrada à mão (ex.: a pessoa viu o site e entrou em contato) — mesmas regras da importação:
// - CNPJ: só dígitos, 14 com zeros à esquerda, dígitos verificadores conferidos; raiz e matriz/filial preenchidas;
// - CNPJ repetido: avisa sem mostrar de quem é o lead;
// - telefones: DDD + número, tipo fixo/celular pelo tamanho;
// - vendedor que cadastra fica como responsável (crm_admin escolhe o vendedor);
// - prioridade calculada pelos CNAEs com a regra da Configuração do CRM.
// A carga da planilha grava direto no banco e não passa por aqui.
export const prepararEmpresaManual: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (data.cnpj !== undefined && data.cnpj !== originalDoc?.cnpj) {
    const { cnpj } = normalizarCnpj(data.cnpj)
    if (!cnpj) throw erro('cnpj', 'CNPJ inválido: confira os 14 dígitos.')
    const existente = await req.payload.find({
      collection: 'crm-empresas',
      where: { cnpj: { equals: cnpj }, ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}) },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true, // só confere se existe; nada do outro lead é devolvido
      req,
    })
    if (existente.docs.length) {
      throw erro('cnpj', 'Este CNPJ já está no CRM. Fale com o administrador do CRM para receber o lead.')
    }
    data.cnpj = cnpj
    data.raizCnpj = cnpj.slice(0, 8)
    if (!data.tipo || !isCrmAdminUser(req.user)) data.tipo = cnpj.slice(8, 12) === '0001' ? 'matriz' : 'filial'
  }

  if (Array.isArray(data.telefones)) {
    data.telefones = (data.telefones as LinhaTelefone[]).map((t) => {
      const n = normalizarTelefone('', t.numero)
      if (!n) return t
      if (!n.valido && operation === 'create' && req.user) {
        throw erro('telefones', 'Telefone fora do padrão: use DDD + número (fixo com 8 dígitos, celular com 9).')
      }
      return { ...t, numero: n.numero, tipo: t.tipo || n.tipo, valido: t.valido ?? n.valido }
    })
  }

  if (operation === 'create' && req.user) {
    if (!isCrmAdminUser(req.user)) data.vendedor = req.user.id
    if (!data.prioridadeCalculada || !isCrmAdminUser(req.user)) {
      const cfg = (await req.payload.findGlobal({ slug: 'crm-configuracao', depth: 0, req })) as RegraPrioridade
      const regra = cfg?.cnaesAlta?.length ? cfg : regraPrioridadePadrao()
      const cnaes = ((data.cnaes ?? []) as LinhaCnae[])
        .map((c) => ({ codigo: soDigitos(c.codigo).padStart(7, '0'), principal: Boolean(c.principal) }))
        .filter((c) => c.codigo !== '0000000')
      const primario = cnaes.find((c) => c.principal) ?? cnaes[0]
      data.prioridadeCalculada = criarCalculoPrioridade(regra)(
        primario?.codigo ?? null,
        cnaes.filter((c) => c !== primario).map((c) => c.codigo),
        String(data.razaoSocial ?? ''),
      )
    }
  }
  return data
}

// Prioridade efetiva = correção manual, se houver; senão a calculada na importação
// (só crm_admin altera esses campos; de outros perfis o valor enviado é ignorado)
export const calcularPrioridade: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  const pode = isCrmAdminUser(req.user)
  const manual =
    pode && data.prioridadeManual !== undefined ? data.prioridadeManual : originalDoc?.prioridadeManual
  const calculada =
    // na criação o valor vem de prepararEmpresaManual (o que o usuário enviou já foi descartado pelo field access)
    (pode || operation === 'create') && data.prioridadeCalculada !== undefined
      ? data.prioridadeCalculada
      : originalDoc?.prioridadeCalculada
  data.prioridade = manual || calculada || 'baixa'
  return data
}

// "Não contatar": registra quem aplicou e quando (e limpa ao retirar)
export const registrarNaoContatar: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data.naoContatar === undefined || data.naoContatar === originalDoc?.naoContatar) return data
  if (data.naoContatar) {
    data.naoContatarEm = new Date().toISOString()
    data.naoContatarPor = req.user?.id ?? null
  } else {
    data.naoContatarEm = null
    data.naoContatarPor = null
  }
  return data
}

// Coleções filhas: só grava se quem está registrando enxerga a empresa (vendedor/apresentador
// responsável, ou crm_admin). Respeita o access control — não usa overrideAccess.
// Sem usuário = operação do próprio sistema (scripts com a Local API); pedidos pela API/admin
// sem login já foram barrados pelo access control da coleção.
export const exigirEmpresaDoUsuario: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!req.user) return data
  const empresa = data.empresa ?? originalDoc?.empresa
  const id = typeof empresa === 'object' && empresa !== null ? empresa.id : empresa
  if (!id) throw new ValidationError({ errors: [{ message: 'Informe a empresa.', path: 'empresa' }] })
  const visivel = await req.payload.find({
    collection: 'crm-empresas',
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user: req.user,
    req,
  })
  if (visivel.docs.length === 0) throw new Forbidden(req.t)
  return data
}
