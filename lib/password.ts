/**
 * Secure password hashing using Node.js built-in crypto (scrypt).
 * No external dependencies — works perfectly in Next.js App Router.
 */
import { promisify } from 'util'
import crypto from 'crypto'

const scrypt = promisify(crypto.scrypt)

const KEYLEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEYLEN)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Support both bcrypt hashes (from old seed) and scrypt hashes
  if (stored.startsWith('$2')) {
    // bcrypt hash — use dynamic require to avoid ESM issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs') as { compare: (a: string, b: string) => Promise<boolean> }
    return bcrypt.compare(password, stored)
  }
  // scrypt hash: "salt:hash"
  const [salt, storedHash] = stored.split(':')
  if (!salt || !storedHash) return false
  const derivedKey = (await scrypt(password, salt, KEYLEN)) as Buffer
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey)
}
