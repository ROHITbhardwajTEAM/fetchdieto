import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    )
  }

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  // Create admin client inside handler — NOT at module level
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  type AuthUser = { id: string; email?: string; email_confirmed_at?: string }

  // Find the user by email
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const users: AuthUser[] = listData?.users ?? []
  const user = users.find((u: AuthUser) => u.email === (email as string))
  if (!user) {
    return NextResponse.json({ error: 'User not found in auth.users' }, { status: 404 })
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ message: 'Email already confirmed', user })
  }

  // Confirm the email by updating the user
  const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Email confirmed successfully!', user: data.user })
}
