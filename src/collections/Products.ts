import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload'

import { FixedToolbarFeature, InlineToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePath } from 'next/cache'

import { anyone } from '../access/anyone'
import { hideFromNonAdmins, isAdmin } from '../access/roles'

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
    create: isAdmin,
    delete: isAdmin,
    read: anyone,
    update: isAdmin,
  },
  labels: { singular: 'Produto', plural: 'Produtos' },
  admin: {
    group: 'Site',
    hidden: hideFromNonAdmins,
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
      label: 'Nome',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug (endereço da página)',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Usado na URL: /produtos/[slug]',
      },
    },
    {
      name: 'logo',
      label: 'Logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      label: 'Status',
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
      label: 'Descrição curta',
      type: 'textarea',
      admin: {
        description: 'Usado nos cards da home',
      },
    },
    {
      name: 'features',
      label: 'Funcionalidades',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'order',
      label: 'Ordem',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Controla a ordem de exibição na home (menor primeiro)',
      },
    },
  ],
}
