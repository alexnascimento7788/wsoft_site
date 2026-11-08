import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { importar, type ModoDuplicados } from '../src/crm/importacao/importar'
import { lerArquivo } from '../src/crm/importacao/ler'

// Importa uma lista de leads (.txt/.csv da Boa Vista ou planilha .xlsx) para o CRM.
//
//   npm run crm:importar -- --dry-run                     (simulação: não grava nada)
//   npm run crm:importar -- --confirmo-origem-licita      (carga real)
//
// Opções: --arquivo <caminho>   (padrão: a lista da pasta data/; prefere o .txt ao .xlsx)
//         --modo ignorar|completar   (duplicados: ignorar, ou atualizar só campos vazios)
//         --lote "<nome>"   --origem boa_vista   --fornecedor "Boa Vista"
//
// O console mostra SÓ contagens e tipos de problema — nunca nomes, telefones ou e-mails.

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const opcao = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}

// Arquivo da lista: o informado em --arquivo, ou o da pasta data/.
// Com .txt/.csv e .xlsx juntos, prefere o texto (original do fornecedor, sem a conversão do Excel).
function acharArquivo() {
  const informado = opcao('arquivo')
  if (informado) return path.resolve(informado)
  const pasta = path.resolve('data')
  const todos = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((f) => /\.(xlsx|txt|csv)$/i.test(f) && !f.startsWith('~$')) : []
  const textos = todos.filter((f) => /\.(txt|csv)$/i.test(f))
  const candidatos = textos.length ? textos : todos
  if (candidatos.length !== 1) {
    throw new Error(
      candidatos.length
        ? `Há ${candidatos.length} arquivos de lista em data/. Informe qual com --arquivo.`
        : 'Nenhuma lista (.txt, .csv ou .xlsx) em data/. Informe o caminho com --arquivo.',
    )
  }
  return path.join(pasta, candidatos[0])
}

// Mostra só o servidor do banco (nunca usuário/senha)
const servidorDoBanco = () => {
  try {
    const u = new URL(process.env.DATABASE_URI || '')
    return `${u.hostname}:${u.port || 5432}`
  } catch {
    return '(DATABASE_URI inválida)'
  }
}

async function run() {
  const dryRun = flag('dry-run')
  const modo = (opcao('modo') ?? 'ignorar') as ModoDuplicados
  if (!['ignorar', 'completar'].includes(modo)) throw new Error('--modo deve ser "ignorar" ou "completar".')
  const arquivo = acharArquivo()
  const nomeArquivo = path.basename(arquivo)

  console.log(`\n${dryRun ? 'SIMULAÇÃO (dry-run) — nada será gravado' : 'CARGA REAL'}`)
  console.log(`Arquivo: ${nomeArquivo}`)
  console.log(`Banco:   ${servidorDoBanco()}`)
  console.log(`Duplicados: ${modo === 'ignorar' ? 'ignorar' : 'atualizar só campos vazios'}\n`)

  if (!dryRun && !flag('confirmo-origem-licita')) {
    throw new Error(
      'Carga real exige --confirmo-origem-licita (confirma que o arquivo tem origem lícita, conforme a LGPD).',
    )
  }

  const payload = await getPayload({ config })
  const inicio = Date.now()
  const { relatorio: r, loteId, modelo, regraSalva } = await importar(payload, lerArquivo(arquivo), {
    dryRun,
    modo,
    lote: {
      nome: opcao('lote') ?? `${nomeArquivo} — ${new Date().toLocaleDateString('pt-BR')}`,
      origem: (opcao('origem') ?? 'boa_vista') as 'boa_vista',
      fornecedorDado: opcao('fornecedor') ?? 'Boa Vista',
      arquivoNome: nomeArquivo,
      origemLicitaConfirmada: flag('confirmo-origem-licita'),
    },
    aoProgredir: (rel) => process.stdout.write(`\r  processadas: ${rel.linhas} linhas…`),
  })
  process.stdout.write('\r' + ' '.repeat(40) + '\r')

  const n = (v: number) => v.toLocaleString('pt-BR')
  console.log(`Modelo reconhecido: ${modelo ?? 'colunas parciais (mapeamento automático)'}`)
  console.log(`Regra de prioridade: ${regraSalva ? 'Configuração do CRM' : 'regra inicial (será salva na Configuração do CRM na carga real)'}\n`)
  console.log('RESULTADO')
  console.log(`  Linhas lidas ................ ${n(r.linhas)}`)
  console.log(`  Válidas ..................... ${n(r.validas)}`)
  console.log(`  ${dryRun ? 'Seriam criadas' : 'Criadas'} .............. ${n(r.criados)}`)
  console.log(`  Duplicadas no arquivo ....... ${n(r.duplicadosNoArquivo)}`)
  console.log(`  Já existiam no CRM .......... ${n(r.jaExistentes)}${modo === 'completar' ? ` (completadas: ${n(r.atualizados)})` : ' (ignoradas)'}`)
  console.log(`  Erros (não importadas) ...... ${n(r.totalErros)}  →  CNPJ ausente ${n(r.erros.cnpj_ausente)} · CNPJ inválido ${n(r.erros.cnpj_invalido)} · sem razão social ${n(r.erros.razao_social_ausente)}`)
  console.log('\nPRIORIDADE DE CONTATO')
  console.log(`  Alta ${n(r.prioridade.alta)} · Média ${n(r.prioridade.media)} · Baixa ${n(r.prioridade.baixa)}`)
  console.log('\nALERTAS DE REVISÃO (importadas, marcadas para revisão)')
  console.log(`  Empresas com alerta ${n(r.comAlerta)}  →  situação não ativa ${n(r.alertas.situacao_nao_ativa)} · em liquidação ${n(r.alertas.em_liquidacao)} · recuperação judicial ${n(r.alertas.recuperacao_judicial)}`)
  console.log('\nCONTATO')
  console.log(`  Sem canal de contato (fora da fila) ... ${n(r.semCanalContato)}`)
  console.log(`  Sem contato na linha .................. ${n(r.semContato)}`)
  console.log(`  Contato sem nome ...................... ${n(r.contatoSemNome)}`)
  console.log(`  Empresário individual ................. ${n(r.empresarioIndividual)}`)
  console.log(`  Telefones: empresa ${n(r.telefonesEmpresa)} · contato ${n(r.telefonesContato)}`)
  console.log('\nGRUPOS')
  console.log(`  Matrizes ${n(r.matrizes)} · Filiais ${n(r.filiais)} · Grupos com mais de uma empresa ${n(r.gruposMatrizFilial)}`)
  console.log('\nGUARDADOS PARA CONFERÊNCIA (não descartados)')
  console.log(`  Telefones fora do padrão (marcados inválidos) ${n(r.avisos.telefone_invalido)} · e-mails ${n(r.avisos.email_invalido)} · CNAEs ${n(r.avisos.cnae_invalido)} · CEPs ${n(r.avisos.cep_invalido)} · UFs ${n(r.avisos.uf_invalida)}`)
  console.log(`\nTempo: ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
  if (loteId) console.log(`Lote de importação nº ${loteId} (CRM → Lotes de importação). Linhas com erro ficam no lote para download.`)
  if (dryRun) console.log('\nNada foi gravado. Para a carga real: npm run crm:importar -- --confirmo-origem-licita')
  process.exit(0)
}

run().catch((err) => {
  // Só a mensagem e o código — o "detail" do Postgres pode conter valores da linha
  const e = err as { message?: string; code?: string; cause?: { code?: string } }
  console.error(`\nErro: ${e.message ?? 'falha na importação'}${e.code || e.cause?.code ? ` (código ${e.code ?? e.cause?.code})` : ''}`)
  process.exit(1)
})
