import { addDataAndFileToRequest, type Endpoint } from 'payload'

import { isCrmAdminUser } from '../../access/roles'
import { lerAutomacao } from './config'

// POST /api/globals/crm-automacao/testar { alvo: 'ia' | 'whatsapp' | 'email' }
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
      const msg = e instanceof Error && e.message.includes('CRM_CHAVE_SEGREDOS') ? e.message : 'Não consegui ler a configuração.'
      return Response.json({ ok: false, mensagem: msg })
    }
    // Carrega o SDK da IA e o nodemailer só quando alguém testa (não pesa no resto do admin)
    const { testarEmail, testarIA, testarWhatsApp } = await import('./conexoes')
    if (alvo === 'ia') return Response.json(await testarIA(cfg))
    if (alvo === 'whatsapp') return Response.json(await testarWhatsApp(cfg))
    if (alvo === 'email') return Response.json(await testarEmail(cfg))
    return Response.json({ message: 'Alvo inválido.' }, { status: 400 })
  },
}
