import { LinkJSXConverter, RichText as ConvertRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { SerializedLinkNode } from '@payloadcms/richtext-lexical'
import type { DefaultNodeTypes } from '@payloadcms/richtext-lexical'

import { cn } from '@/utilities/ui'

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  const slug = typeof value === 'object' ? value.slug : value
  return relationTo === 'products' ? `/produtos/${slug}` : `/${slug}`
}

const jsxConverters = ({
  defaultConverters,
}: {
  defaultConverters: Parameters<typeof LinkJSXConverter>[0] extends never ? never : any
}) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
})

type Props = {
  data: SerializedEditorState<DefaultNodeTypes>
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          wrap: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}
