import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { AppHeaderTitle } from '@/components/app-header-title'
import { PinnedGroupsProvider } from '@/components/pinned-groups'
import { ProgressBar } from '@/components/progress-bar'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@/lib/analytics/analytics'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { effectiveBaseUrl } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import { Users } from 'lucide-react'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Nunito } from 'next/font/google'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
})

const APP_NAME = 'Společné výdaje'
const APP_DESCRIPTION = 'Společné výdaje pro dva, bez reklam a bez účtů.'

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(effectiveBaseUrl),
    title: {
      default: APP_NAME,
      template: `%s · ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    openGraph: {
      title: APP_NAME,
      description: APP_DESCRIPTION,
      type: 'website',
      url: '/',
    },
    appleWebApp: {
      capable: true,
      title: APP_NAME,
      statusBarStyle: 'default',
    },
    applicationName: APP_NAME,
    icons: [
      { url: '/logo/192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo/512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

export const viewport: Viewport = {
  themeColor: '#F7EFE3',
  viewportFit: 'cover',
}

function Content({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <PinnedGroupsProvider
        ids={(
          process.env.DEFAULT_GROUP_IDS ||
          process.env.DEFAULT_GROUP_ID ||
          ''
        )
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)}
      >
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md">
          <div className="max-w-screen-md mx-auto flex items-center gap-2 px-4 h-14">
            <AppHeaderTitle appName={APP_NAME} />
            <div className="ml-auto" />
            <Link
              href="/groups"
              className="clay-sm bg-card w-9 h-9 flex items-center justify-center"
              aria-label="Skupiny"
              title="Skupiny"
            >
              <Users className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col">{children}</div>
        <Toaster />
      </PinnedGroupsProvider>
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const analyticsConfig = await getAnalyticsConfig()
  return (
    <html lang={locale} className={nunito.variable} suppressHydrationWarning>
      <ApplePwaSplash icon="/logo/512x512.png" color="#F7EFE3" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-background">
        <NextIntlClientProvider messages={messages}>
          {/* Rendered inside the provider because it reads translations via
              `useTranslations`, which needs NextIntlClientProvider in its
              ancestor tree. */}
          <ServiceWorkerRegistration />
          <Analytics config={analyticsConfig}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              disableTransitionOnChange
            >
              <Suspense>
                <ProgressBar />
              </Suspense>
              <Content>{children}</Content>
            </ThemeProvider>
          </Analytics>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
