import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { verifyPassword, hashPassword } from '@/lib/password'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET_KEY ?? 'nutritrack-admin-secret-2026'
)

/** Parse admin_token from the Cookie request header (works in all Next.js 16 route handlers) */
function getTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

// GET — check if logged in
export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })
    await jwtVerify(token, SECRET)
    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

// POST — change password
export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = (await jwtVerify(token, SECRET)).payload
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const admin = await prisma.adminCredential.findUnique({
      where: { id: payload.sub as string },
    })
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })

    const valid = await verifyPassword(currentPassword, admin.password_hash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

    const newHash = await hashPassword(newPassword)
    await prisma.adminCredential.update({
      where: { id: admin.id },
      data: { password_hash: newHash },
    })
    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
