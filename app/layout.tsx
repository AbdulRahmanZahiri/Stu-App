import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ScholarFlow – AI-Powered Student Academic Portal',
    template: '%s · ScholarFlow',
  },
  description:
    'ScholarFlow is your all-in-one AI-powered academic portal. Manage courses, track grades, organize tasks, and get AI-driven study assistance — all in one place.',
  keywords: ['student portal', 'academic planner', 'AI study assistant', 'grade tracker', 'university app'],
  authors: [{ name: 'ScholarFlow' }],
  openGraph: {
    title: 'ScholarFlow – AI-Powered Student Academic Portal',
    description: 'Your all-in-one academic platform for university students.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">{`
(() => {
  const THEME_KEY = 'sf-theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function getStoredTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'system';
  }
  function applyTheme(theme) {
    const dark = theme === 'dark' || (theme === 'system' && media.matches);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
  }
  applyTheme(getStoredTheme());
  media.addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  });
})();
`}</Script>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
