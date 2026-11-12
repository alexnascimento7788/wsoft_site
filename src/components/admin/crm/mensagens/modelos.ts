// Modelos de abordagem da Prospecção SiagWeb: e-mail, WhatsApp, formulário do site e roteiro de ligação.
// Funções puras, sem tela.

export type Abordagem = 'safra' | 'reforma' | 'retorno' | 'cnae'

export const ABORDAGENS: { valor: Abordagem; nome: string; resumo: string }[] = [
  { valor: 'safra', nome: 'Safra', resumo: 'A colheita está chegando: organize antes' },
  { valor: 'reforma', nome: 'Reforma Tributária', resumo: 'Nota com CBS e IBS, nota rejeitada é carga parada' },
  { valor: 'retorno', nome: 'Retorno', resumo: 'Para quem ainda não respondeu' },
  { valor: 'cnae', nome: 'Pelo ramo (CNAE)', resumo: 'O nome não diz, mas o CNAE indica grãos: pergunta leve' },
]

// ---- Ramo de atividade (CNAE) em palavras simples, para a abordagem "Pelo ramo" ----
const RAMO: Record<string, string> = {
  '5211701': 'armazém geral',
  '5211799': 'depósito de mercadorias para terceiros',
  '0163600': 'atividades de pós-colheita, como secagem e limpeza de grãos',
  '4622200': 'comércio de soja',
  '4621400': 'comércio de café em grão',
  '4623199': 'comércio de matérias-primas agrícolas',
  '4623108': 'comércio de matérias-primas agrícolas',
  '4632001': 'comércio de cereais e leguminosas',
  '4632003': 'comércio de cereais e leguminosas',
  '1061901': 'beneficiamento de arroz',
  '1081301': 'beneficiamento de café',
  '1041400': 'produção de óleos vegetais',
  '4611700': 'representação comercial de produtos agrícolas',
  '5212500': 'carga e descarga de mercadorias',
}

export type Cnae = { codigo?: string | null; descricao?: string | null; principal?: boolean | null }

// A atividade mais ligada a grãos (primária primeiro); senão a descrição da primária
export function ramoDaEmpresa(cnaes: Cnae[] | null | undefined): { texto: string; ligadoAGraos: boolean } {
  const lista = [...(cnaes ?? [])].sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal)))
  const achado = lista.find((c) => c.codigo && RAMO[c.codigo])
  if (achado) return { texto: RAMO[achado.codigo!]!, ligadoAGraos: true }
  const prim = lista.find((c) => c.descricao)?.descricao
  return { texto: prim ? prim.toLowerCase() : 'atividades ligadas ao agronegócio', ligadoAGraos: false }
}

// O nome já fala de grãos / armazém? Se não fala e o CNAE fala, a abordagem sugerida é "Pelo ramo"
const NOME_DE_GRAOS = /silo|armaz|gr[aã]o|cereal|cerea|agr[ií]col|agro|caf[eé]|soja|milho|feij|arroz|sement|cooperat|coop\b|secad|beneficia|rural|fazend/i
export const abordagemSugerida = (nomes: string[], cnaes: Cnae[] | null | undefined): Abordagem =>
  !nomes.some((n) => NOME_DE_GRAOS.test(n)) && ramoDaEmpresa(cnaes).ligadoAGraos ? 'cnae' : 'safra'

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
  ramo: string
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
    ramo: d.ramo.trim() || 'atividades ligadas a grãos',
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
  cnae: (d) => ({
    assunto: `${d.e}: vocês trabalham com grãos?`,
    titulo: 'Uma pergunta rápida, sem compromisso.',
    paragrafos: [
      `Olá, ${esc(d.n)}, tudo bem?`,
      `Sou ${esc(d.rem)}, da Wsoft, de Boa Esperança (MG). Encontrei a ${esc(d.e)} no cadastro público de empresas${d.loc ? ` de ${esc(d.loc)}` : ''}, com a atividade de <b>${esc(d.ramo)}</b>, e fiquei com uma dúvida: vocês recebem ou armazenam grãos hoje?`,
      'Pergunto porque desenvolvemos o <b>SiagWeb</b>, sistema de gestão para quem recebe, seca e armazena grãos. Se esse for o caso de vocês, ele ajuda em coisas como:',
    ],
    recursos: RECURSOS,
    extra: 'Se não for a realidade da empresa, me desculpe pelo contato: é só me avisar e não volto a escrever.',
    chamada: 'Se fizer sentido, posso te mostrar o sistema em 20 minutos, online, no horário que for melhor para você?',
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
  cnae: (d) =>
    `Olá, *${d.n}*! Tudo bem? 👋\n\nAqui é o ${d.rem}, da *Wsoft*, de Boa Esperança (MG). Vi no cadastro da *${d.e}* a atividade de _${d.ramo}_ e fiquei com uma dúvida rápida: vocês recebem ou armazenam grãos hoje? 🌾\n\nPergunto porque fazemos o *SiagWeb*, sistema para quem recebe, seca e armazena grãos (tickets, estoque por produtor, nota fiscal e financeiro).\n\nSe não for o caso, sem problema, e obrigado pela atenção! 🙂`,
}

export const textoWhatsApp = (a: Abordagem, dados: DadosMensagem) => WHATS[a](base(dados))

// Prévia do balão: *negrito* do WhatsApp vira <b>
// e _itálico_ vira <i>
export const htmlBalao = (texto: string) =>
  esc(texto)
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?])/g, '$1<i>$2</i>')

// ---- Formulário de contato do site da empresa: texto puro (sem layout, sem emoji), curto ----
const semHtml = (t: string) =>
  t
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2: $1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

export function textoFormulario(a: Abordagem, dados: DadosMensagem) {
  const d = base(dados)
  const m = EMAIL[a](d)
  const partes = [
    ...m.paragrafos.map(semHtml),
    ...(m.recursos.length ? [m.recursos.map((r) => `- ${r}`).join('\n')] : []),
    ...(m.extra ? [semHtml(m.extra)] : []),
    m.chamada,
    [d.rem, d.cargo ? `${d.cargo}` : '', `Wsoft · ${TEL}`, SITE].filter(Boolean).join('\n'),
  ]
  return partes.join('\n\n')
}

export const assuntoFormulario = (a: Abordagem, dados: DadosMensagem) =>
  a === 'cnae' ? 'Dúvida sobre a operação de grãos da empresa' : `Sistema para armazém de grãos (SiagWeb) - ${base(dados).e}`

// ---- Roteiro de ligação: sugestões de fala para cada abordagem ----
export type Roteiro = {
  objetivo: string
  abertura: string[]
  gancho: string[]
  perguntas: string[]
  seNaoForDecisor: string[]
  objecoes: { se: string; diga: string }[]
  fechamento: string[]
  recado: string
  dicas: string[]
}

const GANCHO: Record<Abordagem, (d: ReturnType<typeof base>) => string[]> = {
  safra: () => [
    'Estou ligando porque a colheita está chegando e muitos armazéns da região ainda controlam entrada, umidade e descontos em planilha ou em sistemas separados.',
    'Queria entender rapidinho como vocês fazem hoje, para ver se o nosso sistema ajuda ou não.',
  ],
  reforma: () => [
    'Estou ligando por causa da Reforma Tributária: desde 2026 a nota fiscal já leva CBS e IBS, e nota rejeitada é carga parada no pátio.',
    'Queria saber como vocês estão se preparando e, se for útil, te mandar um e-book gratuito que fizemos sobre isso para armazéns.',
  ],
  retorno: () => [
    'Te mandei uma mensagem esses dias sobre o SiagWeb, o nosso sistema para silos e armazéns. Conseguiu dar uma olhada?',
    'Sem problema se não deu tempo: em um minuto eu te conto do que se trata.',
  ],
  cnae: (d) => [
    `Vi no cadastro da empresa a atividade de ${d.ramo} e fiquei com uma dúvida: vocês recebem ou armazenam grãos de produtores hoje?`,
    'Se sim, acho que vale uma conversa rápida; se não, já te libero e obrigado pela atenção.',
  ],
}

export function roteiroLigacao(a: Abordagem, dados: DadosMensagem): Roteiro {
  const d = base(dados)
  const nome = dados.nome.trim()
  return {
    objetivo: 'Descobrir se faz sentido e marcar uma demonstração online de 20 minutos. Não é para vender na ligação.',
    abertura: [
      `Bom dia${nome ? `, ${nome}` : ''}! Aqui é ${d.rem || '[seu nome]'}, da Wsoft, de Boa Esperança, Minas Gerais.`,
      'Você tem um minutinho agora, ou prefere que eu ligue em outro horário?',
    ],
    gancho: GANCHO[a](d),
    perguntas: [
      'Vocês recebem grãos de produtores ou só de produção própria? Quais grãos?',
      'Hoje, como é feito o controle da balança, da umidade e dos descontos?',
      'O estoque por produtor e as notas fiscais saem do mesmo sistema, ou é tudo separado?',
      'O que mais dá trabalho na época da safra?',
    ],
    seNaoForDecisor: [
      'Quem cuida da parte de sistema ou da gestão do armazém aí na empresa?',
      'Qual o melhor horário para falar com essa pessoa? Pode me passar o WhatsApp ou o e-mail dela?',
    ],
    objecoes: [
      {
        se: '“Já temos sistema.”',
        diga: 'Ótimo, então vocês já sabem o valor de ter tudo controlado. O sistema de hoje já faz a nota com CBS e IBS e o estoque por produtor? Se quiser, mostro em 20 minutos como o SiagWeb faz, para vocês compararem com calma.',
      },
      {
        se: '“Agora não tenho tempo.”',
        diga: 'Entendo, a época é corrida mesmo. Qual o melhor dia e horário para eu te ligar de novo? Posso te mandar um resumo pelo WhatsApp enquanto isso?',
      },
      {
        se: '“Manda por e-mail.”',
        diga: 'Mando sim! Qual o melhor e-mail? E para não ficar perdido na caixa de entrada, posso te ligar na quinta para saber o que achou?',
      },
      {
        se: '“Quanto custa?”',
        diga: 'Depende do tamanho da operação e dos módulos que vocês usariam. Na demonstração eu entendo a realidade de vocês e já te passo um valor certo, sem compromisso.',
      },
      {
        se: '“Não trabalhamos com grãos.”',
        diga: 'Obrigado por me avisar! Vou anotar aqui para não incomodar mais. Tenha um ótimo dia.',
      },
    ],
    fechamento: [
      'Pelo que você me contou, acho que vale a pena você ver o sistema funcionando. É online e leva 20 minutos.',
      'Fica melhor para você terça às 10h ou quinta às 15h?',
      'Vou te mandar o convite pelo WhatsApp e pelo e-mail. Obrigado pela atenção!',
    ],
    recado: `Oi, aqui é ${d.rem || '[seu nome]'}, da Wsoft, de Boa Esperança (MG). Estou ligando sobre o SiagWeb, sistema para silos e armazéns de grãos. Vou mandar uma mensagem no WhatsApp; se preferir, o nosso número é ${TEL.split(' · ')[0]}. Obrigado!`,
    dicas: [
      'Fale devagar e com calma; sorria ao falar (dá para ouvir).',
      'Pergunte mais do que fala: quem fala mais na ligação é o cliente.',
      'Anote as respostas e registre a tentativa logo depois de desligar.',
      'Se pedirem para não ligar mais, registre “Pediu para não ser contatado”.',
    ],
  }
}

export function textoRoteiro(r: Roteiro) {
  const lista = (t: string[]) => t.map((x) => `- ${x}`).join('\n')
  return [
    `OBJETIVO: ${r.objetivo}`,
    `1. ABERTURA\n${lista(r.abertura)}`,
    `2. MOTIVO DA LIGAÇÃO\n${lista(r.gancho)}`,
    `3. PERGUNTAS\n${lista(r.perguntas)}`,
    `SE NÃO FOR QUEM DECIDE\n${lista(r.seNaoForDecisor)}`,
    `4. SE O CLIENTE DISSER...\n${r.objecoes.map((o) => `- ${o.se} ${o.diga}`).join('\n')}`,
    `5. FECHAMENTO\n${lista(r.fechamento)}`,
    `RECADO (caixa postal / secretária)\n${r.recado}`,
  ].join('\n\n')
}
