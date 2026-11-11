// Modelos de abordagem (e-mail e WhatsApp) da Prospecção SiagWeb. Funções puras, sem tela.

export type Abordagem = 'safra' | 'reforma' | 'retorno'

export const ABORDAGENS: { valor: Abordagem; nome: string; resumo: string }[] = [
  { valor: 'safra', nome: 'Safra', resumo: 'A colheita está chegando: organize antes' },
  { valor: 'reforma', nome: 'Reforma Tributária', resumo: 'Nota com CBS e IBS, nota rejeitada é carga parada' },
  { valor: 'retorno', nome: 'Retorno', resumo: 'Para quem ainda não respondeu' },
]

export const WSOFT_WHATSAPP = '5535988673237'
const TEL = '(35) 98867-3237 · (35) 98898-3237'
const SITE = 'wsoftinfo.com.br'
const EBOOK = 'https://www.wsoftinfo.com.br/ebook/SiagWeb_Ebook_2026.pdf'

export type DadosMensagem = {
  nome: string
  empresa: string
  cidade: string
  uf: string
  remetente: string
  cargo: string
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export const linkWhatsApp = (numero: string, texto: string) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`

// Número com 55 na frente (o CRM guarda DDD + número)
export const numeroInternacional = (n: string) => {
  const d = n.replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith('55') && d.length > 11 ? d : `55${d}`
}

const base = (d: DadosMensagem) => {
  const uf = d.uf.trim().toUpperCase()
  return {
    n: d.nome.trim() || 'tudo bem',
    e: d.empresa.trim() || 'sua empresa',
    loc: d.cidade.trim() ? d.cidade.trim() + (uf ? `/${uf}` : '') : '',
    rem: d.remetente.trim(),
    cargo: d.cargo.trim(),
  }
}

const RECURSOS = [
  'Tickets de balança com umidade e descontos',
  'Estoque por grão e por produtor, na hora',
  'Nota fiscal com CBS e IBS já calculados',
  'Financeiro e contabilidade integrados',
]

type Conteudo = { assunto: string; titulo: string; paragrafos: string[]; recursos: string[]; extra?: string; chamada: string }

const EMAIL: Record<Abordagem, (d: ReturnType<typeof base>) => Conteudo> = {
  safra: (d) => ({
    assunto: `${d.e}: a safra 2026/27 já tem sistema?`,
    titulo: 'A safra 2026/27 está chegando.',
    paragrafos: [
      `Olá, ${esc(d.n)}, tudo bem?`,
      `Sou ${esc(d.rem)}, da Wsoft, de Boa Esperança (MG). Desenvolvemos o <b>SiagWeb</b>, sistema de gestão para silos e armazéns de grãos.`,
      `Com a colheita chegando, muitos armazéns${d.loc ? ` da região de ${esc(d.loc)}` : ''} ainda controlam entradas, contratos e notas em planilhas e sistemas separados. O SiagWeb reúne tudo <b>em um só painel</b>:`,
    ],
    recursos: RECURSOS,
    chamada: 'Posso te mostrar em uma demonstração online de 20 minutos, no dia e horário que for melhor para você?',
  }),
  reforma: (d) => ({
    assunto: `Reforma Tributária: as notas da ${d.e} já estão prontas?`,
    titulo: 'Nota rejeitada é carga parada.',
    paragrafos: [
      `Olá, ${esc(d.n)}, tudo bem?`,
      `Sou ${esc(d.rem)}, da Wsoft. Desde 2026 a nota fiscal já traz os campos da CBS e do IBS, e em 2027 a CBS passa a valer integralmente. Para um armazém de grãos, cada nota rejeitada é uma carga parada.`,
      'O <b>SiagWeb</b>, nosso sistema para silos e armazéns, emite a nota a partir da operação do armazém:',
    ],
    recursos: [
      'Nota fiscal com CBS e IBS já calculados',
      'Sem redigitar os dados da operação',
      'Integrada ao estoque, ao financeiro e à contabilidade',
    ],
    extra: `Preparamos um e-book gratuito sobre a Reforma para armazéns: <a href="${EBOOK}" style="color:#2f8a35;font-weight:bold">baixar o e-book</a>.`,
    chamada: 'Se fizer sentido, posso te mostrar o sistema em 20 minutos, online. Qual o melhor dia para você?',
  }),
  retorno: (d) => ({
    assunto: `Retomando: SiagWeb para a ${d.e}`,
    titulo: 'Vamos conversar antes da colheita?',
    paragrafos: [
      `Olá, ${esc(d.n)}, tudo bem?`,
      'Passando para retomar meu contato sobre o <b>SiagWeb</b>, o sistema da Wsoft para gestão de silos e armazéns de grãos.',
      'Sei que a época é corrida, por isso a proposta é simples: uma demonstração online de 20 minutos, no horário que for melhor para você, para avaliar se faz sentido antes da safra.',
    ],
    recursos: [],
    chamada: 'Posso agendar para esta semana?',
  }),
}

export const assuntoEmail = (a: Abordagem, dados: DadosMensagem) => EMAIL[a](base(dados)).assunto

// E-mail em HTML com layout de tabela (cola no corpo do Gmail / Outlook)
export function htmlEmail(a: Abordagem, dados: DadosMensagem) {
  const d = base(dados)
  const m = EMAIL[a](d)
  const cta = linkWhatsApp(
    WSOFT_WHATSAPP,
    `Olá! Sou ${dados.nome.trim()} da ${d.e} e quero agendar uma demonstração do SiagWeb.`,
  )
  const P = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2f3441">${t}</p>`
  const recursos = m.recursos.length
    ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;width:100%">' +
      m.recursos
        .map(
          (t) =>
            `<tr><td style="width:30px;vertical-align:top;padding:5px 0"><span style="display:inline-block;width:20px;height:20px;border-radius:10px;background:#4CAF50;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:20px">&#10003;</span></td><td style="padding:5px 0;font-size:15px;color:#1a1f2e;font-weight:bold">${esc(t)}</td></tr>`,
        )
        .join('') +
      '</table>'
    : ''
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">' +
    '<tr><td style="background:#1a1f2e;padding:24px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px">Siag<span style="color:#4CAF50">Web</span></td>' +
    '<td align="right" style="font-size:12px;color:#b4bccb">Um sistema Wsoft</td></tr></table></td></tr>' +
    `<tr><td style="background:#1a1f2e;padding:4px 32px 30px"><div style="font-size:12px;letter-spacing:2px;color:#4CAF50;font-weight:bold;text-transform:uppercase;margin-bottom:8px">Gestão de silos e armazéns de grãos</div><div style="font-size:26px;line-height:1.2;font-weight:bold;color:#ffffff">${esc(m.titulo)}</div></td></tr>` +
    '<tr><td style="height:5px;background:#4CAF50;font-size:0;line-height:0">&nbsp;</td></tr>' +
    `<tr><td style="padding:30px 32px 8px">${m.paragrafos.map(P).join('')}${recursos}${m.extra ? P(m.extra) : ''}${P(`<b>${esc(m.chamada)}</b>`)}` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 26px"><tr><td style="background:#4CAF50;border-radius:8px"><a href="${cta}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:bold;color:#0f2a12;text-decoration:none">Agendar demonstração de 20 min</a></td></tr></table>` +
    `<p style="margin:0;font-size:15px;color:#2f3441">Abraço,</p><p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#1a1f2e">${esc(d.rem)}</p><p style="margin:0 0 26px;font-size:13px;color:#5b6474">${esc(d.cargo)}</p></td></tr>` +
    '<tr><td style="background:#f3f5f2;padding:18px 32px;font-size:12px;line-height:1.6;color:#5b6474">' +
    `<b style="color:#1a1f2e">Wsoft</b> · Boa Esperança (MG)<br>${TEL} · <a href="https://www.${SITE}" style="color:#2f8a35">${SITE}</a> · Instagram @siagweb<br>` +
    '<span style="color:#8a92a0">Se preferir não receber novos contatos, é só responder "remover".</span></td></tr></table>'
  )
}

const WHATS: Record<Abordagem, (d: ReturnType<typeof base>) => string> = {
  safra: (d) =>
    `Olá, *${d.n}*! Tudo bem? 👋\n\nAqui é o ${d.rem}, da *Wsoft*, de Boa Esperança (MG). Desenvolvemos o *SiagWeb*, sistema de gestão para silos e armazéns de grãos:\n\n✅ Tickets com umidade e descontos\n✅ Estoque por grão e produtor\n✅ Nota fiscal com CBS e IBS\n✅ Contabilidade integrada\n\nCom a safra chegando, posso te mostrar o sistema em uma demonstração online de *20 minutos*, no dia e horário que for melhor para você? 📅`,
  reforma: (d) =>
    `Olá, *${d.n}*! Tudo bem? 👋\n\nAqui é o ${d.rem}, da *Wsoft*. Com a Reforma Tributária, a nota fiscal já traz CBS e IBS, e *nota rejeitada é carga parada*.\n\nO *SiagWeb* emite a nota a partir da operação do armazém, com CBS e IBS já calculados.\n\nPreparamos um e-book gratuito sobre a Reforma para armazéns de grãos. Posso te enviar?`,
  retorno: (d) =>
    `Olá, *${d.n}*! Tudo bem?\n\nAqui é o ${d.rem}, da *Wsoft*. Passando para retomar o contato sobre o *SiagWeb*.\n\nUma demonstração online de *20 minutos* esta semana funciona para você? 📅`,
}

export const textoWhatsApp = (a: Abordagem, dados: DadosMensagem) => WHATS[a](base(dados))

// Prévia do balão: *negrito* do WhatsApp vira <b>
export const htmlBalao = (texto: string) => esc(texto).replace(/\*(.+?)\*/g, '<b>$1</b>')
