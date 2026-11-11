'use client'

import { toast } from '@payloadcms/ui'
import { Copy, ExternalLink, Mail, MessageCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { formatarTelefone } from '@/crm/visual'
import {
  ABORDAGENS,
  assuntoEmail,
  htmlBalao,
  htmlEmail,
  linkWhatsApp,
  numeroInternacional,
  textoWhatsApp,
  type Abordagem,
} from './modelos'

import './Mensagens.css'

export type Destino = { tipo: 'whatsapp' | 'email'; valor: string; pessoa: string; contatoId?: number }

type Props = {
  empresa: string
  cidade: string
  uf: string
  remetentePadrao: string
  destinos: Destino[]
  // Depois de copiar / abrir: oferece registrar a tentativa já preenchida
  aoEnviar: (canal: 'whatsapp' | 'email', destino?: Destino) => void
}

const CHAVE_ASSINATURA = 'crm-assinatura'

function copiarTexto(texto: string, msg: string) {
  navigator.clipboard
    .writeText(texto)
    .then(() => toast.success(msg))
    .catch(() => toast.error('Não foi possível copiar. Selecione o texto e use Ctrl+C.'))
}

// Mensagem pronta (Prospecção SiagWeb): dados da empresa já preenchidos, escolha da abordagem,
// prévia do e-mail e do WhatsApp, e botões de copiar / abrir.
export function Mensagens({ empresa, cidade, uf, remetentePadrao, destinos, aoEnviar }: Props) {
  const [aba, setAba] = useState<'email' | 'whatsapp'>(destinos.some((d) => d.tipo === 'whatsapp') ? 'whatsapp' : 'email')
  const [abordagem, setAbordagem] = useState<Abordagem>('safra')
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

  const dados = { nome, empresa, cidade, uf, remetente, cargo }
  const assunto = assuntoEmail(abordagem, dados)
  const html = useMemo(() => htmlEmail(abordagem, dados), [abordagem, nome, empresa, cidade, uf, remetente, cargo]) // eslint-disable-line react-hooks/exhaustive-deps
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
              <b>{a.nome}</b>
              <span>{a.resumo}</span>
            </button>
          ))}
        </div>
        <div className="crm-msg__campos">
          <label>
            Nome do contato
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Carlos" />
          </label>
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
      </div>

      {aba === 'whatsapp' ? (
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
                onClick={() => aoEnviar('whatsapp', destino)}
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
      ) : (
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
