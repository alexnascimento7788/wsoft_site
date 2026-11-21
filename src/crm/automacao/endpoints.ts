import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { isAdminUser, isCrmAdminUser } from '../../access/roles'
import { lerAutomacao, lerCaixaEmail } from './config'

const erroDeChave = (e: unknown) =>
  e instanceof Error && e.message.includes('CRM_CHAVE_SEGREDOS') ? e.message : 'Não consegui ler a configuração.'

// POST /api/globals/crm-automacao/testar { alvo: 'ia' | 'whatsapp' }
// Testa a conexão com o que está SALVO (os segredos nunca vêm do navegador).
export const testarAutomacao: Endpoint = {
  path: '/testar',
  method: 'post',
  handler: async (req) => {
    if (!isCrmAdminUser(req.user)) return Response.json({ message: 'Sem permissão.' }, { status: 403 })
    await addDataAndFileToRequest(req)
    const alvo = (req.data as { alvo?: string } | undefined)?.alvo
    let cfg
    try {
      cfg = await lerAutomacao(req.payload)
    } catch (e) {
      return Response.json({ ok: false, mensagem: erroDeChave(e) })
    }
    // Carrega o SDK da IA só quando alguém testa (não pesa no resto do admin)
    const { testarIA, testarWhatsApp } = await import('./conexoes')
    if (alvo === 'ia') return Response.json(await testarIA(cfg))
    if (alvo === 'whatsapp') return Response.json(await testarWhatsApp(cfg))
    return Response.json({ message: 'Alvo inválido.' }, { status: 400 })
  },
}

// POST /api/users/:id/testar-email — a própria pessoa (ou o administrador) testa a sua caixa salva
export const testarEmailUsuario: Endpoint = {
  path: '/:id/testar-email',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const id = req.routeParams?.id as string | undefined
    if (!req.user || !id) return Response.json({ message: 'Sem permissão.' }, { status: 403 })
    if (!isAdminUser(req.user) && String(req.user.id) !== String(id)) {
      return Response.json({ message: 'Sem permissão.' }, { status: 403 })
    }
    let caixa
    try {
      caixa = await lerCaixaEmail(req.payload, id)
    } catch (e) {
      return Response.json({ ok: false, mensagem: erroDeChave(e) })
    }
    if (!caixa) return Response.json({ message: 'Usuário não encontrado.' }, { status: 404 })
    const { testarEmail } = await import('./conexoes')
    return Response.json(await testarEmail(caixa))
  },
}
