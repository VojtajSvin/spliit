import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * The home page goes straight to the shared group: DEFAULT_GROUP_ID when set,
 * otherwise the most recently created group, otherwise the group list.
 */
export default async function HomePage() {
  let groupId = process.env.DEFAULT_GROUP_ID
  if (!groupId) {
    const latest = await prisma.group.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    groupId = latest?.id
  }
  redirect(groupId ? `/groups/${groupId}` : '/groups')
}
