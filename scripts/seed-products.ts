import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const IMAGES_DIR = 'C:/Users/lequi/Downloads/Imagens'

function textNode(text: string) {
  return { type: 'text', text, version: 1 }
}

function paragraphNode(text: string) {
  return {
    type: 'paragraph',
    children: [textNode(text)],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  }
}

function listNode(items: string[]) {
  return {
    type: 'list',
    listType: 'bullet' as const,
    tag: 'ul' as const,
    start: 1,
    children: items.map((item, i) => ({
      type: 'listitem',
      value: i + 1,
      children: [textNode(item)],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    })),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  }
}

function buildFeaturesRichText(data: { intro: string[]; items: string[]; outro: string }) {
  return {
    root: {
      type: 'root',
      children: [...data.intro.map(paragraphNode), listNode(data.items), paragraphNode(data.outro)],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

function loadFile(filename: string) {
  const filePath = path.join(IMAGES_DIR, filename)
  const data = fs.readFileSync(filePath)
  return {
    data,
    mimetype: 'image/png',
    name: filename,
    size: data.length,
  }
}

async function upsertMedia(payload: Awaited<ReturnType<typeof getPayload>>, filename: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'media',
    data: { alt },
    file: loadFile(filename),
  })
}

async function upsertProduct(
  payload: Awaited<ReturnType<typeof getPayload>>,
  data: {
    name: string
    slug: string
    status: 'ativo' | 'em-breve'
    order: number
    shortDescription?: string
    features?: { intro: string[]; items: string[]; outro: string }
    logoId?: number
  },
) {
  const existing = await payload.find({
    collection: 'products',
    where: { slug: { equals: data.slug } },
    limit: 1,
  })

  const payloadData = {
    name: data.name,
    slug: data.slug,
    status: data.status,
    order: data.order,
    shortDescription: data.shortDescription,
    ...(data.logoId ? { logo: data.logoId } : {}),
    ...(data.features ? { features: buildFeaturesRichText(data.features) } : {}),
  }

  if (existing.docs[0]) {
    return payload.update({
      collection: 'products',
      id: existing.docs[0].id,
      data: payloadData,
    })
  }

  return payload.create({
    collection: 'products',
    data: payloadData,
  })
}

async function run() {
  const payload = await getPayload({ config })

  const cafeLogo = await upsertMedia(payload, 'SIAG_CAFE.png', 'SIAG Café')
  const cereaisLogo = await upsertMedia(payload, 'SIAG_CEREAIS.png', 'SIAG Cereais')
  const siscoopeLogo = await upsertMedia(payload, 'SIAG_SISCOOPE.png', 'SIAG Siscoope')
  const siagWebLogo = await upsertMedia(payload, '04_logo_claro_transparente.png', 'SiagWeb')

  await upsertProduct(payload, {
    name: 'SIAG Café',
    slug: 'siag-cafe',
    status: 'ativo',
    order: 1,
    logoId: cafeLogo.id,
    shortDescription:
      'Gestão completa para armazéns gerais de café: estoque, pesagem, financeiro e emissão de documentos fiscais.',
    features: {
      intro: [
        'Sistema integrado voltado para gerenciamento de armazéns gerais (café).',
        'SIAG Café possui em seu controle:',
      ],
      items: [
        'Sistema integrado voltado para;',
        'Gerenciamento de armazéns gerais;',
        'Estoque de grãos próprio e terceiros;',
        'Tabela de serviços configuráveis;',
        'Descontos de serviços integrado a entrada do lote;',
        'Controle Financeiro;',
        'Lotes de classificação;',
        'Formação de ligas;',
        'Pesagem de grãos integrado a qualquer modelo de balança;',
        'Emissão de documentos fiscais (NFe, NFCe e MDFe);',
        'Emissão de arquivos fiscais (Sintegra, SPED fiscal, SPED contribuições).',
      ],
      outro:
        'Com a solução SIAG Café você otimiza processos, ganha eficiência operacional e ainda consegue reduzir custos.',
    },
  })

  await upsertProduct(payload, {
    name: 'SIAG Cereais',
    slug: 'siag-cereais',
    status: 'ativo',
    order: 2,
    logoId: cereaisLogo.id,
    shortDescription:
      'Gestão completa para armazéns gerais de grãos: estoque, comercialização, contabilidade e documentos fiscais.',
    features: {
      intro: [
        'SIAG Cereais é um sistema integrado voltado para o gerenciamento de armazéns gerais (grãos), é uma solução de gestão que atende toda a demanda de armazéns gerais.',
        'SIAG Cereais possui em seu controle cerealista:',
      ],
      items: [
        'Estoque de grãos próprios e terceiros;',
        'Tabelas de descontos configuráveis;',
        'Descontos de armazenagem e quebra técnica automático;',
        'Pesagem de grãos integrado a qualquer modelo de balança;',
        'Gerenciamento de serviços (secagem, recepção, expedição);',
        'Controle financeiro;',
        'Comercialização dos grãos (contratos de compra e venda, gerenciamento de custo);',
        'Contabilidade (balancete, DRE, razão) integrados a todos os processos do sistema;',
        'Emissão de documentos fiscais (NFe, MDFe);',
        'Emissão de arquivos fiscais (Sintegra, SPED fiscal, SPED contribuições, SPED contábil).',
      ],
      outro:
        'Ao utilizar nossa solução em gestão SIAG Cereais, as operações do dia-a-dia ficam muito mais simples e fáceis de serem feitas.',
    },
  })

  await upsertProduct(payload, {
    name: 'SIAG Siscoope',
    slug: 'siag-siscoope',
    status: 'ativo',
    order: 3,
    logoId: siscoopeLogo.id,
    shortDescription:
      'Gestão completa de cooperativas: cooperados, conta corrente, sobras e perdas, financeiro e fiscal.',
    features: {
      intro: [
        'O SiagSiscoope é um sistema integrado focado na gestão completa de cooperativas, conectando administração, produção e cooperados em uma única plataforma.',
        'Principais recursos:',
      ],
      items: [
        'Gestão de Cooperados: controle de cadastro, quotas-partes e capital social;',
        'Conta Corrente Cooperativa: conciliação de créditos, débitos e adiantamentos de insumos;',
        'Rateio de Sobras e Perdas: apuração e distribuição automática por participação;',
        'Recebimento e Armazenagem: pesagem integrada, classificação e controle de estoques;',
        'Comercialização: contratos de compra, venda e repasse de produção;',
        'Financeiro e Contabilidade: fluxo de caixa integrado a plano de contas cooperativista;',
        'Fiscal: emissão de NFe, MDFe e arquivos SPED (Fiscal, Contribuições e Contábil).',
      ],
      outro: 'A solução otimiza a governança e simplifica as rotinas do dia a dia da cooperativa.',
    },
  })

  await upsertProduct(payload, {
    name: 'SiagWeb',
    slug: 'siagweb',
    status: 'ativo',
    order: 4,
    shortDescription:
      'A gestão de grãos, contratos, fiscal e indicadores que saiu do desktop e foi para a nuvem. Plataforma SaaS completa para armazéns e cerealistas.',
    logoId: siagWebLogo.id,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      whatsappNumber: '5535987069309',
      contactEmail: 'contato@wsoftinfo.com.br',
      contactCell: '(35) 9 8898-3237',
      contactPhone: '(35) 3851-3237',
      heroSubtitle: 'Otimizamos processos e recursos alinhando-os à estratégia do seu negócio.',
      statNumbers: [
        { label: 'Anos de experiência', value: 22, suffix: '+' },
        { label: 'Clientes atendidos', value: 100, suffix: '+' },
        { label: 'Usuários ativos', value: 600, suffix: '+' },
      ],
    },
  })

  console.log('Seed concluído.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
