'use client'

import { GroupForm } from '@/components/group-form'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { Activity, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = ({
  runtimeFeatureFlags,
}: {
  runtimeFeatureFlags: RuntimeFeatureFlags
}) => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()
  const t = useTranslations()

  if (isLoading) return <></>

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/groups/${groupId}/information`}
          className="clay bg-sky p-4 flex items-center gap-2 font-extrabold"
        >
          <Info className="w-5 h-5" /> {t('Information.title')}
        </Link>
        <Link
          href={`/groups/${groupId}/activity`}
          className="clay bg-butter p-4 flex items-center gap-2 font-extrabold"
        >
          <Activity className="w-5 h-5" /> {t('Activity.title')}
        </Link>
      </div>
      <GroupForm
        group={data?.group}
        onSubmit={async (groupFormValues, participantId) => {
          await mutateAsync({ groupId, participantId, groupFormValues })
          await utils.groups.invalidate()
        }}
        protectedParticipantIds={data?.participantsWithExpenses}
        enableGroupDeletion={runtimeFeatureFlags.enableGroupDeletion}
      />
    </>
  )
}
