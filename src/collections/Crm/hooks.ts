import { Forbidden, ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { isCrmAdminUser } from '../../access/roles'

// Na criação, grava quem registrou (relação + nome)
export const preencherRegistradoPor: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && req.user) {
    data.registradoPor = req.user.id
    data.registradoPorNome = (req.user as { name?: string | null }).name || req.user.email
  }
  return data
}

// Prioridade efetiva = correção manual, se houver; senão a calculada na importação
// (só crm_admin altera esses campos; de outros perfis o valor enviado é ignorado)
export const calcularPrioridade: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const pode = isCrmAdminUser(req.user)
  const manual =
    pode && data.prioridadeManual !== undefined ? data.prioridadeManual : originalDoc?.prioridadeManual
  const calculada =
    pode && data.prioridadeCalculada !== undefined
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
