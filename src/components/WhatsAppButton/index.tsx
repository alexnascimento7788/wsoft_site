import { getCachedGlobal } from '@/utilities/getGlobals'
import { WhatsAppButtonClient } from './Client'

export async function WhatsAppButton() {
  const siteSettings = await getCachedGlobal('site-settings', 0)()

  if (!siteSettings?.whatsappNumber) return null

  return (
    <WhatsAppButtonClient
      number={siteSettings.whatsappNumber}
      message={siteSettings.whatsappMessage || ''}
    />
  )
}
