import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Peter's Forex Bot — Trade Intelligence Dashboard",
  description: 'Live analytics for the Deriv Volatility 75 trading bot',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: '#0f1117' }}>
        {children}
      </body>
    </html>
  )
}
