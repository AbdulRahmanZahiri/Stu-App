import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://api.dicebear.com https://images.unsplash.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // In dev allow localhost; in prod lock to origins only
      isDev
        ? "connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co https://api.groq.com"
        : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.mymemory.translated.net",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
