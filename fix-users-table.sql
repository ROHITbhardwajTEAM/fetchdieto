-- Run this in the Supabase SQL Editor to fix the users table schema
-- Go to: https://supabase.com/dashboard/project/ixlrisvefklmpkiibnyv/sql

-- Step 1: Add missing columns to the users table (safely, only if they don't exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS height FLOAT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS calorie_target INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Change id column from BigInt to TEXT/UUID
-- WARNING: Only do this if the users table is EMPTY or you don't mind recreating it.
-- If you have existing users, contact support before running this.

-- OPTION A: If users table is empty (safe to do):
-- ALTER TABLE users DROP CONSTRAINT "all data_pkey";
-- ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
-- ALTER TABLE users ADD PRIMARY KEY (id);

-- OPTION B: If users table has data and you want to keep BigInt id,
-- update schema.prisma User model to use Int @id instead of String @id @default(uuid())

-- Step 3: Make email nullable consistent (it's nullable in the live DB)
-- No action needed since schema already has email as String with @unique which is correct

-- Verify the result:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
