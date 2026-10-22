import { getOwnerGroupIds } from '@/lib/owner'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Owner devices go straight to the main group; everyone else gets their own
 * group list (only groups opened via an invite or created on that device).
 */
export default async function HomePage() {
  const [main] = await getOwnerGroupIds()
  redirect(main ? `/groups/${main}` : '/groups')
}
