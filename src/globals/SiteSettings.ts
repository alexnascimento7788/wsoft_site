import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { hideFromNonAdmins, isAdmin } from '../access/roles'
import { anyone } from '../access/anyone'

const revalidateSiteSettings: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // no-op outside of a Next.js request context (e.g. scripts using the Local API)
  }
  return doc
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Configurações do Site',
  access: {
    read: anyone,
    update: isAdmin,
  },
  admin: {
    group: 'Site',
    hidden: hideFromNonAdmins,
  },
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contato',
          fields: [
            {
              name: 'whatsappNumber',
              label: 'Número do WhatsApp',
              type: 'text',
              required: true,
              admin: {
                description: 'Somente números, com DDI e DDD. Ex: 5535912345678',
              },
            },
            {
              name: 'whatsappMessage',
              label: 'Mensagem padrão do WhatsApp',
              type: 'textarea',
              defaultValue: 'Olá! Vim pelo site da WSoft e gostaria de mais informações.',
            },
            {
              name: 'contactEmail',
              label: 'E-mail de contato',
              type: 'text',
            },
            {
              name: 'contactPhone',
              label: 'Telefone',
              type: 'text',
            },
            {
              name: 'contactCell',
              label: 'Celular',
              type: 'text',
            },
          ],
        },
        {
          label: 'Home',
          fields: [
            {
              name: 'heroHeadline',
              label: 'Título principal',
              type: 'text',
              defaultValue: 'Soluções em Sistemas para o Agronegócio',
            },
            {
              name: 'heroSubtitle',
              label: 'Subtítulo',
              type: 'textarea',
            },
            {
              name: 'statNumbers',
              type: 'array',
              label: 'Nossos números',
              maxRows: 6,
              fields: [
                {
                  name: 'label',
                  label: 'Rótulo',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'value',
                  label: 'Valor',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'suffix',
                  label: 'Sufixo',
                  type: 'text',
                  admin: {
                    description: 'Ex: "+", "anos"',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
