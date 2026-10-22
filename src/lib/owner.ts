import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const OWNER_COOKIE = 'spliit-owner'

export function isOwnerKey(key: string | undefined | null) {
  const expected = process.env.OWNER_KEY
  if (!expected || !key) return false
  const a = Buffer.from(key)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Default group ids, only for devices that opened the owner link. */
export async function getOwnerGroupIds(): Promise<string[]> {
  const store = await cookies()
  if (!isOwnerKey(store.get(OWNER_COOKIE)?.value)) return []
  return (process.env.DEFAULT_GROUP_IDS || process.env.DEFAULT_GROUP_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
