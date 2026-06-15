import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This route uses the Supabase Admin API to confirm a user's email
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured in .env.local' },
      { status: 500 }
    )
  }

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Find the user by email
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const user = users.find(u => u.email === email)
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
