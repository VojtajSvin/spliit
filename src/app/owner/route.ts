import { isOwnerKey, OWNER_COOKIE, ownerCookieValue } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * /owner?key=… marks this device as an owner device (shows default groups).
 * The cookie stores the key's sha256, never the key itself.
 */
export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  const res = NextResponse.redirect(new URL('/', req.url))
  if (key && isOwnerKey(key))
    res.cookies.set(OWNER_COOKIE, ownerCookieValue(key), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10,
    })
  return res
}
