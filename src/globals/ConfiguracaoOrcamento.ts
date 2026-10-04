import type { GlobalConfig } from 'payload'

import { canEditBudget, canReadBudget } from '../access/roles'
import { MESES } from '../collections/Orcamento/meses'

export const ConfiguracaoOrcamento: GlobalConfig = {
  slug: 'configuracao-orcamento',
  label: 'Configuração do orçamento',
  access: {
    read: canReadBudget,
    update: canEditBudget,
  },
  admin: {
    group: 'Orçamento',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'anoVigente',
          label: 'Ano vigente',
          type: 'number',
          required: true,
          min: 2000,
          max: 2100,
          defaultValue: () => new Date().getFullYear(),
          admin: { width: '50%', description: 'Ano que o painel abre por padrão.' },
        },
        {
          name: 'mesFechado',
          label: 'Último mês fechado',
          type: 'select',
          options: MESES.map((mes, i) => ({ label: mes.nome, value: String(i + 1) })),
          admin: {
            width: '50%',
            description:
              'Até qual mês o realizado está completo. Depois dele, o painel usa a previsão. Em branco = mês anterior ao atual.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'alertaPercentual',
          label: 'Alerta de execução (%)',
          type: 'number',
          required: true,
          defaultValue: 90,
          min: 1,
          max: 200,
          admin: {
            width: '50%',
            description: 'Conta ou centro de custo fica em "Atenção" ao atingir este % do orçado.',
          },
        },
        {
          name: 'limitePercentual',
          label: 'Limite de execução (%)',
          type: 'number',
          required: true,
          defaultValue: 100,
          min: 1,
          max: 300,
          admin: {
            width: '50%',
            description: 'Acima deste % do orçado, fica como "Estourado".',
          },
        },
      ],
    },
  ],
}
