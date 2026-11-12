'use client'

import { toast } from '@payloadcms/ui'
import { ClipboardList, Copy, ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { formatarTelefone } from '@/crm/visual'
import {
  ABORDAGENS,
  abordagemSugerida,
  assuntoEmail,
  assuntoFormulario,
  htmlBalao,
  htmlEmail,
  linkWhatsApp,
  numeroInternacional,
  ramoDaEmpresa,
  roteiroLigacao,
  textoFormulario,
  textoRoteiro,
  textoWhatsApp,
  type Abordagem,
  type Cnae,
} from './modelos'

import './Mensagens.css'

export type Destino = { tipo: 'whatsapp' | 'email'; valor: string; pessoa: string; contatoId?: number }

type Aba = 'whatsapp' | 'email' | 'formulario' | 'ligacao'

type Props = {
  empresa: string
  // Razão social e nome fantasia: se nenhum fala de grãos e o CNAE fala, sugere a abordagem "Pelo ramo"
  nomes: string[]
  cnaes: Cnae[]
  cidade: string
  uf: string
  remetentePadrao: string
  destinos: Destino[]
  // Depois de copiar / abrir: oferece registrar a tentativa já preenchida
  // (formulário do site entra como canal "Outro")
  aoEnviar: (canal: 'whatsapp' | 'email' | 'outro', destino?: Destino) => void
}

const CHAVE_ASSINATURA = 'crm-assinatura'

function copiarTexto(texto: string, msg: string) {
  navigator.clipboard
    .writeText(texto)
    .then(() => toast.success(msg))
    .catch(() => toast.error('Não foi possível copiar. Selecione o texto e use Ctrl+C.'))
}

// O WhatsApp do computador (app do Windows/Mac) às vezes estraga os emojis que chegam pelo link.
// Por isso a mensagem também vai para a área de transferência: se vier quebrada, é só apagar e colar.
export function copiarParaWhatsApp(texto: string) {
  navigator.clipboard
    .writeText(texto)
    .then(() =>
      toast.success('Mensagem também copiada. Se os emojis aparecerem estranhos no WhatsApp, apague o texto e cole (Ctrl+V).', {
        duration: 9000,
      }),
    )
    .catch(() => undefined)
}

// Mensagem pronta (Prospecção SiagWeb): dados da empresa já preenchidos, escolha da abordagem,
// prévia do e-mail e do WhatsApp, e botões de copiar / abrir.
export function Mensagens({ empresa, nomes, cnaes, cidade, uf, remetentePadrao, destinos, aoEnviar }: Props) {
  const [aba, setAba] = useState<Aba>(destinos.some((d) => d.tipo === 'whatsapp') ? 'whatsapp' : 'email')
  const [abordagem, setAbordagem] = useState<Abordagem>(() => abordagemSugerida(nomes, cnaes))
  const sugerida = useMemo(() => abordagemSugerida(nomes, cnaes), [nomes, cnaes])
  const [ramo, setRamo] = useState(() => ramoDaEmpresa(cnaes).texto)
  const whats = destinos.filter((d) => d.tipo === 'whatsapp')
  const emails = destinos.filter((d) => d.tipo === 'email')
  const [whatsEscolhido, setWhatsEscolhido] = useState(whats[0]?.valor ?? '')
  const [emailEscolhido, setEmailEscolhido] = useState(emails[0]?.valor ?? '')
  const destino =
    aba === 'whatsapp' ? whats.find((d) => d.valor === whatsEscolhido) : emails.find((d) => d.valor === emailEscolhido)
  const [nome, setNome] = useState(destino?.pessoa ?? '')
  const [remetente, setRemetente] = useState(remetentePadrao)
  const [cargo, setCargo] = useState('Comercial Wsoft')

  // Assinatura lembrada neste navegador
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_ASSINATURA) ?? 'null') as { rem?: string; cargo?: string } | null
      if (s?.rem) setRemetente(s.rem)
      if (s?.cargo) setCargo(s.cargo)
    } catch {
      /* sem armazenamento: usa o padrão */
    }
  }, [])
  const salvarAssinatura = (rem: string, c: string) => {
    try {
      localStorage.setItem(CHAVE_ASSINATURA, JSON.stringify({ rem, cargo: c }))
    } catch {
      /* ignora */
    }
  }

  // Ao trocar o destino, o nome acompanha a pessoa daquele número / e-mail
  useEffect(() => {
    if (destino?.pessoa) setNome(destino.pessoa)
  }, [destino?.pessoa])

  const dados = { nome, empresa, cidade, uf, remetente, cargo, ramo }
  const assunto = assuntoEmail(abordagem, dados)
  const html = useMemo(() => htmlEmail(abordagem, dados), [abordagem, nome, empresa, cidade, uf, remetente, cargo, ramo]) // eslint-disable-line react-hooks/exhaustive-deps
  const formulario = textoFormulario(abordagem, dados)
  const roteiro = roteiroLigacao(abordagem, dados)
  const texto = textoWhatsApp(abordagem, dados)
  const numero = numeroInternacional(whatsEscolhido)

  const copiarEmail = async () => {
    const div = document.createElement('div')
    div.innerHTML = html
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([div.innerText], { type: 'text/plain' }),
        }),
      ])
      toast.success('E-mail copiado: cole no corpo do Gmail ou do Outlook.')
      aoEnviar('email', destino)
    } catch {
      toast.error('Não foi possível copiar. Use “Copiar código HTML”.')
    }
  }

  return (
    <div className="crm-msg">
      <div className="crm-msg__config">
        <div className="crm-msg__abordagens" role="group" aria-label="Abordagem">
          {ABORDAGENS.map((a) => (
            <button
              key={a.valor}
              type="button"
              className="crm-msg__abordagem"
              aria-pressed={abordagem === a.valor}
              onClick={() => setAbordagem(a.valor)}
            >
              <b>
                {a.nome}
                {a.valor === sugerida && <em className="crm-msg__sugerida">sugerida</em>}
              </b>
              <span>{a.resumo}</span>
            </button>
          ))}
        </div>
        <div className="crm-msg__campos">
          <label>
            Nome do contato
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Carlos" />
          </label>
          {abordagem === 'cnae' && (
            <label className="crm-msg__ramo">
              Ramo de atividade (do CNAE, pode ajustar)
              <input value={ramo} onChange={(e) => setRamo(e.target.value)} />
            </label>
          )}
          <label>
            Quem assina
            <input
              value={remetente}
              onChange={(e) => {
                setRemetente(e.target.value)
                salvarAssinatura(e.target.value, cargo)
              }}
            />
          </label>
          <label>
            Cargo
            <input
              value={cargo}
              onChange={(e) => {
                setCargo(e.target.value)
                salvarAssinatura(remetente, e.target.value)
              }}
            />
          </label>
        </div>
      </div>

      <div className="crm-msg__abas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'whatsapp'} onClick={() => setAba('whatsapp')}>
          <MessageCircle size={14} /> WhatsApp
        </button>
        <button type="button" role="tab" aria-selected={aba === 'email'} onClick={() => setAba('email')}>
          <Mail size={14} /> E-mail
        </button>
        <button type="button" role="tab" aria-selected={aba === 'formulario'} onClick={() => setAba('formulario')}>
          <ClipboardList size={14} /> Formulário do site
        </button>
        <button type="button" role="tab" aria-selected={aba === 'ligacao'} onClick={() => setAba('ligacao')}>
          <Phone size={14} /> Roteiro de ligação
        </button>
      </div>

      {aba === 'formulario' && (
        <div className="crm-msg__painel">
          <div className="crm-msg__barra">
            <span className="crm-msg__para">Para o “Fale conosco” do site da empresa</span>
            <span className="crm-msg__acoes">
              <button type="button" className="crm-btn" onClick={() => copiarTexto(assuntoFormulario(abordagem, dados), 'Assunto copiado.')}>
                <Copy size={13} /> Copiar assunto
              </button>
              <button
                type="button"
                className="crm-btn crm-btn--registrar"
                onClick={() => {
                  copiarTexto(formulario, 'Texto copiado: cole no campo de mensagem do formulário.')
                  aoEnviar('outro')
                }}
              >
                <Copy size={13} /> Copiar texto
              </button>
            </span>
          </div>
          <p className="crm-msg__assunto">
            <b>Assunto:</b> {assuntoFormulario(abordagem, dados)}
          </p>
          <pre className="crm-msg__texto">{formulario}</pre>
          <p className="crm-msg__dica">
            Texto simples, sem layout nem emoji, para colar no formulário de contato do site da empresa. {formulario.length}{' '}
            caracteres{formulario.length > 1000 ? ' — se o formulário limitar o tamanho, corte a lista de recursos.' : '.'}
          </p>
        </div>
      )}

      {aba === 'ligacao' && (
        <div className="crm-msg__painel crm-roteiro">
          <div className="crm-msg__barra">
            <span className="crm-msg__para">
              <b>Objetivo:</b> {roteiro.objetivo}
            </span>
            <span className="crm-msg__acoes">
              <button type="button" className="crm-btn" onClick={() => copiarTexto(textoRoteiro(roteiro), 'Roteiro copiado.')}>
                <Copy size={13} /> Copiar roteiro
              </button>
            </span>
          </div>
          <ol className="crm-roteiro__passos">
            <li>
              <h5>Abertura</h5>
              {roteiro.abertura.map((t) => (
                <p key={t} className="crm-roteiro__fala">{t}</p>
              ))}
            </li>
            <li>
              <h5>Motivo da ligação</h5>
              {roteiro.gancho.map((t) => (
                <p key={t} className="crm-roteiro__fala">{t}</p>
              ))}
            </li>
            <li>
              <h5>Perguntas (ouça mais do que fala)</h5>
              <ul>
                {roteiro.perguntas.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="crm-roteiro__sub">Se não for quem decide:</p>
              <ul>
                {roteiro.seNaoForDecisor.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </li>
            <li>
              <h5>Se o cliente disser…</h5>
              <dl className="crm-roteiro__objecoes">
                {roteiro.objecoes.map((o) => (
                  <div key={o.se}>
                    <dt>{o.se}</dt>
                    <dd>{o.diga}</dd>
                  </div>
                ))}
              </dl>
            </li>
            <li>
              <h5>Fechamento</h5>
              {roteiro.fechamento.map((t) => (
                <p key={t} className="crm-roteiro__fala">{t}</p>
              ))}
            </li>
          </ol>
          <div className="crm-roteiro__extra">
            <div>
              <h5>Recado (caixa postal ou secretária)</h5>
              <p>{roteiro.recado}</p>
            </div>
            <div>
              <h5>Dicas</h5>
              <ul>
                {roteiro.dicas.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {aba === 'whatsapp' && (
        <div className="crm-msg__painel">
          <div className="crm-msg__barra">
            <label className="crm-msg__para">
              Para
              {whats.length ? (
                <select value={whatsEscolhido} onChange={(e) => setWhatsEscolhido(e.target.value)}>
                  {whats.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {formatarTelefone(d.valor)} · {d.pessoa}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="crm-msg__sem">Nenhum celular válido nesta empresa.</span>
              )}
            </label>
            <span className="crm-msg__acoes">
              <button type="button" className="crm-btn" onClick={() => copiarTexto(texto, 'Mensagem copiada.')}>
                <Copy size={13} /> Copiar mensagem
              </button>
              {numero && (
                <button type="button" className="crm-btn" onClick={() => copiarTexto(numero, 'Número copiado.')}>
                  <Copy size={13} /> Copiar número
                </button>
              )}
              <a
                className="crm-btn crm-btn--whats"
                href={numero ? linkWhatsApp(numero, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  copiarParaWhatsApp(texto)
                  aoEnviar('whatsapp', destino)
                }}
              >
                <ExternalLink size={13} /> Abrir no WhatsApp
              </a>
            </span>
          </div>
          <div className="crm-msg__chat">
            <div className="crm-msg__balao" dangerouslySetInnerHTML={{ __html: htmlBalao(texto) }} />
          </div>
          <p className="crm-msg__dica">No WhatsApp, os trechos entre asteriscos aparecem em negrito. Envie do WhatsApp Business da Wsoft.</p>
        </div>
      )}

      {aba === 'email' && (
        <div className="crm-msg__painel">
          <div className="crm-msg__barra">
            <label className="crm-msg__para">
              Para
              {emails.length ? (
                <select value={emailEscolhido} onChange={(e) => setEmailEscolhido(e.target.value)}>
                  {emails.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.valor} · {d.pessoa}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="crm-msg__sem">Nenhum e-mail nesta empresa.</span>
              )}
            </label>
            <span className="crm-msg__acoes">
              {emailEscolhido && (
                <button type="button" className="crm-btn" onClick={() => copiarTexto(emailEscolhido, 'E-mail do contato copiado.')}>
                  <Copy size={13} /> Copiar endereço
                </button>
              )}
              <button type="button" className="crm-btn" onClick={() => copiarTexto(assunto, 'Assunto copiado.')}>
                <Copy size={13} /> Copiar assunto
              </button>
              <button type="button" className="crm-btn crm-btn--registrar" onClick={copiarEmail}>
                <Copy size={13} /> Copiar e-mail
              </button>
              <button type="button" className="crm-btn" onClick={() => copiarTexto(html, 'Código HTML copiado.')}>
                Código HTML
              </button>
            </span>
          </div>
          <p className="crm-msg__assunto">
            <b>Assunto:</b> {assunto}
          </p>
          <div className="crm-msg__caixa">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <p className="crm-msg__dica">
            “Copiar e-mail” copia com o layout: cole direto no corpo do Gmail ou do Outlook. O botão verde do e-mail abre uma
            conversa no WhatsApp da Wsoft para agendar a demonstração.
          </p>
        </div>
      )}
    </div>
  )
}
