export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import { resolveLandlord } from '@/lib/landlord-context'

export async function generateMetadata(): Promise<Metadata> {
  const landlord = await resolveLandlord()
  const title = landlord?.brandName ?? 'FurnishedPortal'
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${title}` },
    description: `${title} — furnished midterm rentals`,
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;700&family=Arapey:ital@0;1&family=Open+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
