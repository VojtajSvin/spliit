'use client'

import {
  getArchivedGroups,
  getRecentGroups,
} from '@/app/groups/recent-groups-helpers'
import { usePinnedGroups } from '@/components/pinned-groups'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Chips for switching groups: the pinned groups (DEFAULT_GROUP_IDS) first in
 * their configured order, then other groups known on this device, oldest first.
 */
export function GroupSwitcher({
  groupId,
  groupName,
}: {
  groupId: string
  groupName: string
}) {
  const t = useTranslations('Dashboard')
  const pinned = usePinnedGroups()
  const [localIds, setLocalIds] = useState<string[]>([])

  useEffect(() => {
    const archived = new Set(getArchivedGroups())
    setLocalIds(
      getRecentGroups()
        .map((g) => g.id)
        .filter((id) => !archived.has(id) || id === groupId),
    )
  }, [groupId])

  const ids = [...new Set([...pinned, ...localIds, groupId])].slice(0, 100)
  const { data } = trpc.groups.list.useQuery({ groupIds: ids })
  const found = new Map((data?.groups ?? []).map((g) => [g.id, g]))
  const others = ids
    .filter((id) => !pinned.includes(id) && found.has(id))
    .sort((a, b) =>
      found.get(a)!.createdAt.localeCompare(found.get(b)!.createdAt),
    )
  const groups = data
    ? [...pinned.filter((id) => found.has(id)), ...others].map((id) => ({
        id,
        name: found.get(id)!.name,
      }))
    : [{ id: groupId, name: groupName }]

  return (
    <nav
      aria-label={t('groups')}
      className="-mx-4 px-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`/groups/${g.id}`}
          className={cn(
            'clay-sm shrink-0 px-4 py-2 text-sm font-extrabold whitespace-nowrap',
            g.id === groupId ? 'bg-sage-strong text-white' : 'bg-card',
          )}
          aria-current={g.id === groupId ? 'page' : undefined}
        >
          {g.name}
        </Link>
      ))}
      <Link
        href={`/groups/create?from=${groupId}`}
        className="clay-sm shrink-0 px-4 py-2 text-sm font-extrabold whitespace-nowrap bg-butter flex items-center gap-1"
        data-testid="new-group"
      >
        <Plus className="w-4 h-4" />
        {t('newGroup')}
      </Link>
    </nav>
  )
}
