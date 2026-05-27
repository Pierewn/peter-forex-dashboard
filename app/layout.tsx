import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: "Peter's Trading Bot | Live Analytics Dashboard",
  description: 'Real-time trading analytics and performance insights for the Deriv trading bot',
  keywords: ['trading', 'forex', 'analytics', 'dashboard', 'bot'],
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} bg-background`}>
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
