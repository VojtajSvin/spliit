'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ACTIVE_USER_CHANGED_EVENT,
  ACTIVE_USER_NONE,
  activeUserStorageKey,
  chosenParticipantId,
  isOptOut,
  OPEN_ACTIVE_USER_EVENT,
  persistActiveUser,
} from '@/lib/active-user'
import { useMediaQuery } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { useTranslations } from 'next-intl'
import { ComponentProps, useEffect, useState } from 'react'

export function ActiveUserModal({ groupId }: { groupId: string }) {
  const t = useTranslations('Expenses.ActiveUserModal')
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })

  const group = groupData?.group
  const participantIds = group?.participants.map((p) => p.id).join(',') ?? ''
  const [stored, setStored] = useState(ACTIVE_USER_NONE)

  useEffect(() => {
    const openPicker = () => setOpen(true)
    window.addEventListener(OPEN_ACTIVE_USER_EVENT, openPicker)
    return () => window.removeEventListener(OPEN_ACTIVE_USER_EVENT, openPicker)
  }, [])

  useEffect(() => {
    if (!group) return
    const ids = group.participants.map((p) => p.id)

    const storedNow = () => localStorage.getItem(activeUserStorageKey(group.id))
    const current = storedNow()
    setStored(current ?? ACTIVE_USER_NONE)
    // Missing choice: ask. An explicit "Nechci vybírat" stays closed; the
    // personal views show the prompt instead of someone else's balance.
    if (!chosenParticipantId(current, ids) && !isOptOut(current)) {
      setOpen(true)
    }

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ groupId?: string }>).detail
      if (detail?.groupId && detail.groupId !== group.id) return
      const next = storedNow()
      setStored(next ?? ACTIVE_USER_NONE)
      if (chosenParticipantId(next, ids) || isOptOut(next)) setOpen(false)
    }
    window.addEventListener(ACTIVE_USER_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ACTIVE_USER_CHANGED_EVENT, onChange)
  }, [group, participantIds])

  function updateOpen(next: boolean) {
    if (group && !next) {
      const ids = group.participants.map((p) => p.id)
      const stored = localStorage.getItem(activeUserStorageKey(group.id))
      if (!chosenParticipantId(stored, ids) && !isOptOut(stored)) {
        persistActiveUser(group.id, ACTIVE_USER_NONE)
      }
    }
    setOpen(next)
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={updateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <ActiveUserForm
            key={`${group?.id ?? ''}-${stored}`}
            group={group}
            initial={stored}
            close={() => updateOpen(false)}
          />
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-center text-muted-foreground">
              {t('footer')}
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={updateOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t('title')}</DrawerTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DrawerHeader>
        <ActiveUserForm
          key={`${group?.id ?? ''}-${stored}`}
          className="px-4"
          group={group}
          initial={stored}
          close={() => updateOpen(false)}
        />
        <DrawerFooter className="pt-2">
          <p className="text-sm text-center text-muted-foreground">
            {t('footer')}
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ActiveUserForm({
  group,
  initial,
  close,
  className,
}: ComponentProps<'form'> & {
  group?: AppRouterOutput['groups']['get']['group']
  initial: string
  close: () => void
}) {
  const t = useTranslations('Expenses.ActiveUserModal')
  const [selected, setSelected] = useState(
    initial === 'none' ? ACTIVE_USER_NONE : initial,
  )

  return (
    <form
      className={cn('grid items-start gap-4', className)}
      onSubmit={(event) => {
        if (!group) return

        event.preventDefault()
        const ids = group.participants.map((p) => p.id)
        persistActiveUser(
          group.id,
          chosenParticipantId(selected, ids) ?? ACTIVE_USER_NONE,
        )
        close()
      }}
    >
      <RadioGroup value={selected} onValueChange={setSelected}>
        <div className="flex flex-col gap-4 my-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={ACTIVE_USER_NONE} id="none" />
            <Label htmlFor="none" className="italic font-normal flex-1">
              {t('nobody')}
            </Label>
          </div>
          {group?.participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2">
              <RadioGroupItem value={participant.id} id={participant.id} />
              <Label htmlFor={participant.id} className="flex-1">
                {participant.name}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
