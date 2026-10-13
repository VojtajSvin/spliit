'use client'

import { InviteButton } from '@/app/groups/[groupId]/invite-button'
import { trpc } from '@/trpc/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Header title: the open group's name (or the app name), plus 'Pozvat'. */
export function AppHeaderTitle({ appName }: { appName: string }) {
  const m = usePathname().match(/^\/groups\/([^/]+)/)
  const groupId = m && !['create', 'add'].includes(m[1]) ? m[1] : null
  const { data } = trpc.groups.get.useQuery(
    { groupId: groupId ?? '' },
    { enabled: !!groupId },
  )
  const name = groupId ? data?.group?.name : appName
  return (
    <>
      <Link
        href={groupId ? `/groups/${groupId}` : '/'}
        className="flex items-center gap-2 font-black text-lg min-w-0"
      >
        <span className="clay-sm bg-peach w-9 h-9 shrink-0 flex items-center justify-center text-xl">
          🏡
        </span>
        <span className="truncate" data-testid="header-title">
          {name ?? ''}
        </span>
      </Link>
      {groupId && data?.group && (
        <InviteButton groupId={groupId} groupName={data.group.name} />
      )}
    </>
  )
}
