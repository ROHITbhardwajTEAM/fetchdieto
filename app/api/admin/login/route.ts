import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/password'
import { SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET_KEY ?? 'nutritrack-admin-secret-2026'
)

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Fetch admin from DB
    const admin = await prisma.adminCredential.findUnique({
      where: { username: username.trim().toLowerCase() },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password
    const valid = await verifyPassword(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Issue signed JWT (expires in 8 hours)
    const token = await new SignJWT({ sub: admin.id, username: admin.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(SECRET)

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Admin Login Error]', msg)
    return NextResponse.json(
      { error: 'Server error', detail: process.env.NODE_ENV !== 'production' ? msg : undefined },
      { status: 500 }
    )
  }
}
