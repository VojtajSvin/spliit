'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

/** /groups/add?ids=a,b,c saves several groups to this device's group chips. */
function AddGroups() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const ids = (useSearchParams().get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)
  const utils = trpc.useUtils()
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const groupId of [...ids].reverse()) {
        const data = await utils.groups.get.fetch({ groupId }).catch(() => null)
        if (data?.group) saveRecentGroup({ id: groupId, name: data.group.name })
      }
      if (!cancelled) router.replace(ids[0] ? `/groups/${ids[0]}` : '/groups')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <p className="p-6 font-extrabold">{t('addingGroups')}</p>
}

export default function AddGroupsPage() {
  return (
    <Suspense>
      <AddGroups />
    </Suspense>
  )
}
