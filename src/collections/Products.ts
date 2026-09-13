import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePath } from 'next/cache'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const revalidate = (slug?: string | null) => {
  try {
    revalidatePath('/', 'layout')
    if (slug) revalidatePath(`/produtos/${slug}`)
  } catch {
    // no-op outside of a Next.js request context (e.g. scripts using the Local API)
  }
}

const revalidateProduct: CollectionAfterChangeHook = ({ doc }) => {
  revalidate(doc?.slug)
  return doc
}

const revalidateProductDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidate(doc?.slug)
  return doc
}

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'order'],
  },
  hooks: {
    afterChange: [revalidateProduct],
    afterDelete: [revalidateProductDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Usado na URL: /produtos/[slug]',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'em-breve',
      options: [
        { label: 'Ativo', value: 'ativo' },
        { label: 'Em breve', value: 'em-breve' },
      ],
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      admin: {
        description: 'Usado nos cards da home',
      },
    },
    {
      name: 'features',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Controla a ordem de exibição na home (menor primeiro)',
      },
    },
  ],
}
