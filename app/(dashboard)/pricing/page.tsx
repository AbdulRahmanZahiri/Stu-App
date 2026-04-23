'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Headphones, BrainCircuit, Lock,
  Crown, Star, ArrowRight, GraduationCap, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/app-store'
import { PaymentModal } from '@/components/ui/payment-form'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FREE_FEATURES = [
  'Dashboard & overview',
  'Course management',
  'Task & deadline tracking',
  'Calendar view',
  'Grade tracker',
  'Notes & resources',
  'Community access',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited AI Assistant',
  'Audio Study Podcasts',
  'Academic Planner',
  'Syllabus AI parsing',
  'Smart study suggestions',
  'Priority support',
  'Early access to new features',
]

export default function PricingPage() {
  const { plan, setPlan } = useAppStore()
  const router = useRouter()
  const [showPayment, setShowPayment] = useState(false)
  const [downgrading, setDowngrading] = useState(false)

  function handlePaymentSuccess() {
    setShowPayment(false)
    setPlan('pro')
    toast.success('Welcome to ScholarFlow Pro! 🎉 All features unlocked.')
    router.push('/dashboard')
  }

  async function handleDowngrade() {
    setDowngrading(true)
    await new Promise((r) => setTimeout(r, 800))
    setPlan('free')
    setDowngrading(false)
    toast('Switched back to Free plan.')
  }

  return (
    <>
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            open={showPayment}
            onClose={() => setShowPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </AnimatePresence>

      <div className="min-h-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-semibold text-violet-700">
            <Crown className="h-3.5 w-3.5" />
            ScholarFlow Pro
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Unlock your full academic potential
          </h1>
          <p className="mt-3 text-base text-slate-500">
            AI-powered tools to study smarter, stay organized, and reach your goals.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {/* Free card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(
              'relative flex flex-col rounded-3xl border-2 bg-white p-7 shadow-sm transition-all',
              plan === 'free' ? 'border-slate-300' : 'border-slate-100',
            )}
          >
            {plan === 'free' && (
              <Badge className="absolute -top-3 left-6 bg-slate-700 text-white text-[10px]">Current Plan</Badge>
            )}
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Free</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="mb-1 text-sm text-slate-400">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Basic tools for every student</p>
            </div>

            <ul className="mb-8 flex-1 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                AI Assistant <span className="text-xs ml-1">(Pro only)</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                Audio Podcasts <span className="text-xs ml-1">(Pro only)</span>
              </li>
            </ul>

            {plan === 'pro' ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDowngrade}
                disabled={downgrading}
              >
                {downgrading ? 'Switching...' : 'Switch to Free'}
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" disabled>
                Current Plan
              </Button>
            )}
          </motion.div>

          {/* Pro card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'relative flex flex-col rounded-3xl border-2 bg-gradient-to-b from-violet-600 to-indigo-700 p-7 text-white shadow-xl',
              plan === 'pro' ? 'border-violet-400 ring-4 ring-violet-200' : 'border-transparent',
            )}
          >
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/5" />

            {plan === 'pro' ? (
              <Badge className="absolute -top-3 left-6 bg-violet-500 text-white text-[10px] border-0">
                <Star className="mr-1 h-2.5 w-2.5 fill-white" />
                Active
              </Badge>
            ) : (
              <Badge className="absolute -top-3 left-6 bg-amber-400 text-amber-900 text-[10px] border-0">
                Most Popular
              </Badge>
            )}

            <div className="relative mb-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-200">Pro</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold">$9.99</span>
                <span className="mb-1 text-sm text-violet-300">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-violet-300">Full AI-powered academic suite</p>
            </div>

            <ul className="relative mb-8 flex-1 space-y-2.5">
              {PRO_FEATURES.map((f, i) => (
                <li key={f} className={cn('flex items-start gap-2.5 text-sm', i === 0 ? 'font-semibold text-violet-100' : 'text-violet-100')}>
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="relative">
              {plan === 'pro' ? (
                <Button
                  className="w-full bg-white text-violet-700 font-bold hover:bg-violet-50"
                  size="sm"
                  disabled
                >
                  <Crown className="mr-1.5 h-4 w-4" />
                  Pro Active
                </Button>
              ) : (
                <Button
                  className="w-full bg-white text-violet-700 font-bold hover:bg-violet-50 shadow-lg"
                  size="sm"
                  onClick={() => setShowPayment(true)}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Upgrade to Pro
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              <p className="mt-3 text-center text-[10px] text-violet-300">
                Cancel anytime · No hidden fees · Instant access
              </p>
            </div>
          </motion.div>
        </div>

        {/* Cancel subscription — shown only for Pro users */}
        {plan === 'pro' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Manage Subscription</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  You&apos;re on the Pro plan. Downgrade to Free at any time — no charge on next billing cycle.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                onClick={handleDowngrade}
                disabled={downgrading}
              >
                {downgrading ? 'Cancelling...' : 'Cancel & Downgrade to Free'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-12 max-w-3xl"
        >
          <p className="mb-6 text-center text-sm font-semibold text-slate-400 uppercase tracking-widest">
            What&apos;s included in Pro
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BrainCircuit,
                color: 'bg-violet-100 text-violet-600',
                title: 'Unlimited AI Assistant',
                desc: 'Ask anything — summaries, study plans, flashcards, essay help. Powered by Llama 3.3 70B.',
              },
              {
                icon: Headphones,
                color: 'bg-indigo-100 text-indigo-600',
                title: 'Audio Study Podcasts',
                desc: 'Turn any note into a podcast-style audio summary. Study while commuting or working out.',
              },
              {
                icon: GraduationCap,
                color: 'bg-sky-100 text-sky-600',
                title: 'Academic Planner',
                desc: 'Map your entire degree path, track prerequisites, and plan your semesters ahead.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className={cn('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl', item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mb-1 text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  )
}
