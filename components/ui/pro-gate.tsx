'use client'

import Link from 'next/link'
import { Crown, Lock, Sparkles, Headphones, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const ICON_MAP: Record<string, React.ElementType> = {
  ai: BrainCircuit,
  audio: Headphones,
  default: Sparkles,
}

interface ProGateProps {
  feature: 'ai' | 'audio' | 'default'
  title: string
  description: string
}

export function ProGate({ feature, title, description }: ProGateProps) {
  const Icon = ICON_MAP[feature] ?? Sparkles

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto max-w-md text-center"
      >
        {/* Icon ring */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200" />
          <Icon className="relative h-9 w-9 text-white" />
          <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-md">
            <Crown className="h-3.5 w-3.5 text-amber-900" />
          </div>
        </div>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          <Lock className="h-3 w-3" />
          Pro Feature
        </div>

        <h2 className="mt-3 text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>

        <div className="mt-6 space-y-3">
          <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:from-violet-700 hover:to-indigo-700">
            <Link href="/pricing">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro — $9.99/mo
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full text-slate-400">
            <Link href="/dashboard">Go back to Dashboard</Link>
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          Cancel anytime · Instant access · No hidden fees
        </p>
      </motion.div>
    </div>
  )
}
