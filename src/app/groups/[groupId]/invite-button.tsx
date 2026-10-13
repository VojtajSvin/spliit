'use client'

import { useBaseUrl } from '@/lib/hooks'
import { Check, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/** Shares the group link via the iOS share sheet, or copies it as a fallback. */
export function InviteButton({
  groupId,
  groupName,
}: {
  groupId: string
  groupName: string
}) {
  const t = useTranslations('Dashboard')
  const baseUrl = useBaseUrl()
  const [copied, setCopied] = useState(false)

  async function invite() {
    const url = `${baseUrl ?? window.location.origin}/groups/${groupId}?ref=invite`
    const text = t('inviteText', { name: groupName })
    if (navigator.share) {
      try {
        await navigator.share({ title: groupName, text, url })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
    } catch {
      window.prompt(t('inviteCopyPrompt'), url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      type="button"
      onClick={invite}
      data-testid="invite"
      className="clay-sm shrink-0 px-4 py-2 text-sm font-extrabold whitespace-nowrap bg-sky flex items-center gap-1"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {copied ? t('inviteCopied') : t('invite')}
    </button>
  )
}
