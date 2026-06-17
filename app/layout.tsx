import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'FetchDieto — Daily Diet Tracker',
  description: 'Track your daily nutrition, meals, macros and reach your health goals with FetchDieto.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/logo.png',    type: 'image/png' },
    ],
    apple:   { url: '/logo.png', type: 'image/png' },
    shortcut: '/favicon.png',
  },
  verification: {
    google: 'TBEXI6mMuDzKmk8mGYXw4MmPZoYdUEuN8qHXbJ3AnzY',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF6F0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Extra explicit favicon links — bypasses Next.js metadata caching */}
        <link rel="icon"          type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon"               href="/logo.png"   />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#2D3561',
              border: '1px solid #EDE4D8',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 24px rgba(45,53,97,0.10)',
            },
          }}
        />
      </body>
    </html>
  )
}
