import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  // Block clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Leak no referrer to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features we don't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Force HTTPS for 1 year (only kicks in on real HTTPS deployments)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Basic XSS filter for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Content Security Policy — locks down what can load
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts + framer-motion need unsafe-inline
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind inline styles + framer-motion
      "style-src 'self' 'unsafe-inline'",
      // Images from our allowed CDNs
      "img-src 'self' data: blob: https://*.supabase.co https://api.dicebear.com https://images.unsplash.com",
      // Fonts from self only
      "font-src 'self' data:",
      // API calls: same origin + Supabase + Groq
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com",
      // No <object> or <embed> ever
      "object-src 'none'",
      // No framing from external origins
      "frame-ancestors 'none'",
      // Base tag restricted to same origin
      "base-uri 'self'",
      // Forms post to same origin only
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
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
