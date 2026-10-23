'use client'

import { DeleteGroupNotice } from '@/app/groups/[groupId]/delete-group-notice'
import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { useToast } from '@/components/ui/use-toast'
import { claimPendingActiveUser } from '@/lib/active-user'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useEffect } from 'react'
import { CurrentGroupProvider } from './current-group-context'
import { GroupHeader } from './group-header'
import { GroupTabs } from './group-tabs'
import { SaveGroupLocally } from './save-recent-group'

export function GroupLayoutClient({
  groupId,
  children,
}: PropsWithChildren<{ groupId: string }>) {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const t = useTranslations('Groups.NotFound')
  const { toast } = useToast()

  useEffect(() => {
    if (data && !data.group) {
      toast({
        description: t('text'),
        variant: 'destructive',
      })
    }
  }, [data])

  useEffect(() => {
    if (!data?.group) return
    claimPendingActiveUser(groupId, data.group.participants)
  }, [data?.group, groupId])

  const props =
    isLoading || !data?.group
      ? { isLoading: true as const, groupId, group: undefined }
      : { isLoading: false as const, groupId, group: data.group }

  if (isLoading) {
    return (
      <CurrentGroupProvider {...props}>
        <GroupHeader />
        {children}
        <GroupTabs groupId={groupId} />
      </CurrentGroupProvider>
    )
  }

  return (
    <CurrentGroupProvider {...props}>
      <GroupHeader />
      <DeleteGroupNotice />
      {children}
      <SaveGroupLocally />
      <ActiveUserModal groupId={groupId} />
      <GroupTabs groupId={groupId} />
    </CurrentGroupProvider>
  )
}
