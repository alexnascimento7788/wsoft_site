// Opções do registro de contato (sem dependências de servidor: usadas também nas telas)

export const CANAIS_CONTATO = [
  { label: 'Ligação', value: 'ligacao' },
  { label: 'WhatsApp (manual)', value: 'whatsapp' },
  { label: 'E-mail (manual)', value: 'email' },
  { label: 'Outro', value: 'outro' },
]

export const RESULTADOS_CONTATO = [
  { label: 'Enviado, aguardando retorno', value: 'aguardando_retorno' },
  { label: 'Não atendeu', value: 'nao_atendeu' },
  { label: 'Número inválido ou errado', value: 'numero_invalido' },
  { label: 'Atendeu, mas não é a pessoa certa', value: 'pessoa_errada' },
  { label: 'Falou com o decisor', value: 'falou_decisor' },
  { label: 'Pediu retorno', value: 'pediu_retorno' },
  { label: 'Sem interesse', value: 'sem_interesse' },
  { label: 'Pediu para não ser contatado', value: 'nao_contatar' },
]

// Resultados em que houve conversa (liberam a qualificação do lead)
export const RESULTADOS_COM_CONVERSA = ['pessoa_errada', 'falou_decisor', 'pediu_retorno', 'sem_interesse', 'nao_contatar']
