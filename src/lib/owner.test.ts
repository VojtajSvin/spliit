import { createHash } from 'node:crypto'
import {
  isOwnerCookie,
  isOwnerKey,
  OWNER_KEY_SHA256,
  ownerCookieValue,
} from './owner'

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

describe('owner key', () => {
  const originalHash = process.env.OWNER_KEY_SHA256
  const originalKey = process.env.OWNER_KEY

  afterEach(() => {
    if (originalHash === undefined) delete process.env.OWNER_KEY_SHA256
    else process.env.OWNER_KEY_SHA256 = originalHash
    if (originalKey === undefined) delete process.env.OWNER_KEY
    else process.env.OWNER_KEY = originalKey
  })

  it('does not treat OWNER_KEY or the digest itself as the key', () => {
    delete process.env.OWNER_KEY_SHA256
    process.env.OWNER_KEY = 'plaintext-must-not-match'
    expect(isOwnerKey(null)).toBe(false)
    expect(isOwnerKey('')).toBe(false)
    expect(isOwnerKey('plaintext-must-not-match')).toBe(false)
    expect(isOwnerKey(OWNER_KEY_SHA256)).toBe(false)
    expect(isOwnerCookie(OWNER_KEY_SHA256)).toBe(true)
  })

  it('accepts a key only when its sha256 matches the override', () => {
    const key = 'device-owner-secret'
    process.env.OWNER_KEY_SHA256 = sha256(key).toUpperCase()
    process.env.OWNER_KEY = 'ignored-raw-key'
    expect(isOwnerKey(key)).toBe(true)
    expect(isOwnerKey('ignored-raw-key')).toBe(false)
    expect(isOwnerKey(`${key} `)).toBe(false)
  })

  it('stores the hash in the cookie and checks that hash the same way', () => {
    const key = 'device-owner-secret'
    process.env.OWNER_KEY_SHA256 = sha256(key)
    const cookie = ownerCookieValue(key)
    expect(cookie).toBe(sha256(key))
    expect(cookie).not.toContain(key)
    expect(isOwnerCookie(cookie)).toBe(true)
    expect(isOwnerCookie(`  ${cookie.toUpperCase()}  `)).toBe(true)
    expect(isOwnerCookie(key)).toBe(false)
    expect(isOwnerCookie(undefined)).toBe(false)
    expect(isOwnerCookie('ab')).toBe(false)
  })

  it('fails closed on a malformed override and falls back when it is blank', () => {
    process.env.OWNER_KEY_SHA256 = 'not-a-hash'
    expect(isOwnerKey('anything')).toBe(false)
    expect(isOwnerCookie(OWNER_KEY_SHA256)).toBe(false)

    process.env.OWNER_KEY_SHA256 = '   '
    expect(isOwnerCookie(OWNER_KEY_SHA256)).toBe(true)
    expect(isOwnerKey('not-the-key')).toBe(false)
  })
})
