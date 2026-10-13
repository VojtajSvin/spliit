'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { GroupForm } from '@/components/group-form'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export const CreateGroup = ({
  defaultCurrencyCode,
}: {
  defaultCurrencyCode: string
}) => {
  const t = useTranslations('Dashboard')
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  // "Nová skupina" from a group prefills its people and currency.
  const fromId = useSearchParams().get('from')
  const [people, setPeople] = useState<'same' | 'other'>('same')
  const { data: fromData, isLoading } = trpc.groups.get.useQuery(
    { groupId: fromId ?? '' },
    { enabled: !!fromId },
  )
  if (fromId && isLoading) return null
  const template = fromData?.group

  // With other people, keep only "me" (the active user of the source group).
  const activeId =
    fromId && typeof window !== 'undefined'
      ? localStorage.getItem(`${fromId}-activeUser`)
      : null
  const me = template?.participants.find((p) => p.id === activeId)?.name
  const participants = template
    ? people === 'same'
      ? template.participants.map((p) => ({ name: p.name }))
      : [{ name: me ?? t('me') }, { name: '' }]
    : undefined

  return (
    <div className="flex flex-col gap-4">
      {template && (
        <div className="flex gap-2" data-testid="people-choice">
          {(['same', 'other'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPeople(v)}
              className={cn(
                'clay-sm flex-1 px-4 py-2 text-sm font-extrabold',
                people === v ? 'bg-sage-strong text-white' : 'bg-card',
              )}
            >
              {v === 'same' ? t('samePeople') : t('otherPeople')}
            </button>
          ))}
        </div>
      )}
      <GroupForm
        key={people}
        defaultCurrencyCode={template?.currencyCode ?? defaultCurrencyCode}
        defaultParticipants={participants}
        onSubmit={async (groupFormValues) => {
          const { groupId } = await mutateAsync({ groupFormValues })
          // Saved here rather than only once the group page has loaded it, so
          // the group is not lost if the user leaves before that.
          saveRecentGroup({ id: groupId, name: groupFormValues.name })
          await utils.groups.invalidate()
          router.push(`/groups/${groupId}`)
        }}
      />
    </div>
  )
}
