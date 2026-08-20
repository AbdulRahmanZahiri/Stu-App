'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-sm text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900">404</h1>
        <p className="mt-2 text-lg font-semibold text-slate-700">Page not found</p>
        <p className="mt-2 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
