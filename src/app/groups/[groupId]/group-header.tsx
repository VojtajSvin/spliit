'use client'

import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()
  const pathname = usePathname()
  // The dashboard has its own hero; the app header already shows the name.
  if (pathname === `/groups/${groupId}`) return null

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-black text-2xl">
        <Link href={`/groups/${groupId}`}>
          {isLoading ? (
            <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
          ) : (
            <div className="flex">{group.name}</div>
          )}
        </Link>
      </h1>
      {group && <ShareButton group={group} />}
    </div>
  )
}
