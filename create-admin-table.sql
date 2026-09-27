-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin: username = "admin", password = "admin@2026"
-- (hash generated with bcryptjs rounds=12)
-- To change the password, run: npm run admin:setup
INSERT INTO admin_credentials (username, password_hash)
VALUES (
  'admin',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
  -- default password: "admin@2026"  ← CHANGE THIS IMMEDIATELY AFTER SETUP
)
ON CONFLICT (username) DO NOTHING;
