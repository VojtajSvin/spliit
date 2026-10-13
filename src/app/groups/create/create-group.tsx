'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useRouter, useSearchParams } from 'next/navigation'

export const CreateGroup = ({
  defaultCurrencyCode,
}: {
  defaultCurrencyCode: string
}) => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  // "Nová skupina" from a group prefills its people and currency.
  const fromId = useSearchParams().get('from')
  const { data: fromData, isLoading } = trpc.groups.get.useQuery(
    { groupId: fromId ?? '' },
    { enabled: !!fromId },
  )
  if (fromId && isLoading) return null
  const template = fromData?.group

  return (
    <GroupForm
      defaultCurrencyCode={template?.currencyCode ?? defaultCurrencyCode}
      defaultParticipants={template?.participants.map((p) => ({
        name: p.name,
      }))}
      onSubmit={async (groupFormValues) => {
        const { groupId } = await mutateAsync({ groupFormValues })
        // Saved here rather than only once the group page has loaded it, so the
        // group is not lost if the user leaves before that.
        saveRecentGroup({ id: groupId, name: groupFormValues.name })
        await utils.groups.invalidate()
        router.push(`/groups/${groupId}`)
      }}
    />
  )
}
