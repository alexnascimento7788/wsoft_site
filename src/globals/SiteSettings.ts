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
              type: 'text',
              required: true,
              admin: {
                description: 'Somente números, com DDI e DDD. Ex: 5535912345678',
              },
            },
            {
              name: 'whatsappMessage',
              type: 'textarea',
              defaultValue: 'Olá! Vim pelo site da WSoft e gostaria de mais informações.',
            },
            {
              name: 'contactEmail',
              type: 'text',
            },
            {
              name: 'contactPhone',
              type: 'text',
            },
            {
              name: 'contactCell',
              type: 'text',
            },
          ],
        },
        {
          label: 'Home',
          fields: [
            {
              name: 'heroHeadline',
              type: 'text',
              defaultValue: 'Soluções em Sistemas para o Agronegócio',
            },
            {
              name: 'heroSubtitle',
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
                  type: 'text',
                  required: true,
                },
                {
                  name: 'value',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'suffix',
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
