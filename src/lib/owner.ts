import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const OWNER_COOKIE = 'spliit-owner'

/**
 * SHA-256 hex of the owner key. The raw key is never committed.
 * `OWNER_KEY_SHA256` overrides this at runtime when it is a 64-char hex digest.
 */
export const OWNER_KEY_SHA256 =
  '69233dcfe211b156c8166a13b54f5a22711c1ee5b3a8f1854b857e01abe67591'

const SHA256_HEX = /^[0-9a-f]{64}$/

function expectedOwnerKeySha256() {
  const fromEnv = process.env.OWNER_KEY_SHA256?.trim().toLowerCase()
  const candidate = fromEnv || OWNER_KEY_SHA256
  return SHA256_HEX.test(candidate) ? candidate : null
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

/** Timing-safe compare of two hex digests. Unequal lengths never match. */
function digestsMatch(actual: string, expected: string) {
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** True when `key` is the owner key: sha256(key) matches the expected digest. */
export function isOwnerKey(key: string | undefined | null) {
  if (!key) return false
  const expected = expectedOwnerKeySha256()
  if (!expected) return false
  return digestsMatch(sha256Hex(key), expected)
}

/** Cookie value for a verified owner key. This is the hash, never the key. */
export function ownerCookieValue(key: string) {
  return sha256Hex(key)
}

/**
 * True when the cookie holds the owner-key digest. Checked the same way as
 * `isOwnerKey`: a timing-safe compare against the committed hash (or override).
 */
export function isOwnerCookie(value: string | undefined | null) {
  if (!value) return false
  const expected = expectedOwnerKeySha256()
  if (!expected) return false
  return digestsMatch(value.trim().toLowerCase(), expected)
}

/** Default group ids, only for devices that opened the owner link. */
export async function getOwnerGroupIds(): Promise<string[]> {
  const store = await cookies()
  if (!isOwnerCookie(store.get(OWNER_COOKIE)?.value)) return []
  return (process.env.DEFAULT_GROUP_IDS || process.env.DEFAULT_GROUP_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
