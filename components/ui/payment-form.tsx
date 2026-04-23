'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { motion } from 'framer-motion'
import {
  Crown, Lock, ShieldCheck, X, Loader2, CheckCircle2,
  CreditCard, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Stripe publishable key — safe to expose client-side
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// ---------------------------------------------------------------------------
// Inner form — inside <Elements> context
// ---------------------------------------------------------------------------
function CheckoutForm({
  email,
  onSuccess,
  onCancel,
}: {
  email: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe  = useStripe()
  const elements = useElements()
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Card validation failed')
      setLoading(false)
      return
    }

    // Create payment intent on server
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()

    if (!res.ok || !data.clientSecret) {
      setError(data.error ?? 'Failed to initialize payment')
      setLoading(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: data.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?upgraded=true`,
        receipt_email: email,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(onSuccess, 1500)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-10 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
        <p className="mt-1 text-sm text-slate-500">Welcome to ScholarFlow Pro 🎉</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { email: 'never' } },
        }}
      />

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-[11px] text-slate-500">
          Payments are secured by <span className="font-semibold text-slate-700">Stripe</span>. Your card info never touches our servers.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
          disabled={!stripe || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5" />
              Pay $9.99/mo
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Demo form — shown when Stripe keys are not configured
// ---------------------------------------------------------------------------
function DemoCheckoutForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry]         = useState('')
  const [cvc, setCvc]               = useState('')
  const [name, setName]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function formatCardNumber(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = cardNumber.replace(/\s/g, '')

    if (digits.length < 16) { setError('Enter a valid 16-digit card number'); return }
    if (expiry.length < 5)  { setError('Enter a valid expiry date (MM/YY)'); return }
    if (cvc.length < 3)     { setError('Enter a valid CVC'); return }
    if (!name.trim())       { setError('Enter the cardholder name'); return }

    setError(null)
    setLoading(true)
    await new Promise((r) => setTimeout(r, 2000))
    setLoading(false)
    setDone(true)
    setTimeout(onSuccess, 1500)
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-10 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
        <p className="mt-1 text-sm text-slate-500">Welcome to ScholarFlow Pro 🎉</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card tabs visual */}
      <div className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50 p-1">
        {[
          { label: 'Card', icon: CreditCard },
        ].map((tab) => (
          <div key={tab.label} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 shadow-sm text-xs font-semibold text-slate-700">
            <tab.icon className="h-3.5 w-3.5 text-violet-600" />
            {tab.label}
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Cardholder Name</Label>
        <Input
          placeholder="John Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="cc-name"
          className="h-10"
        />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Card Number</Label>
        <div className="relative">
          <Input
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            autoComplete="cc-number"
            inputMode="numeric"
            maxLength={19}
            className="h-10 pr-10"
          />
          <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1.5 block">Expiry Date</Label>
          <Input
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            autoComplete="cc-exp"
            inputMode="numeric"
            maxLength={5}
            className="h-10"
          />
        </div>
        <div>
          <Label className="text-xs font-medium mb-1.5 block">CVC</Label>
          <div className="relative">
            <Input
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="cc-csc"
              inputMode="numeric"
              maxLength={4}
              className="h-10 pr-8"
              type="password"
            />
            <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-[11px] text-slate-500">
          256-bit SSL encryption · PCI DSS compliant · Your data is never stored on our servers.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5" />
              Pay $9.99/mo
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main exported modal
// ---------------------------------------------------------------------------
interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  email?: string
}

export function PaymentModal({ open, onClose, onSuccess, email = '' }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchError, setFetchError]     = useState<string | null>(null)
  const hasStripe = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  useEffect(() => {
    if (!open || !hasStripe) return
    setClientSecret(null)
    setFetchError(null)

    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret)
        else setFetchError(data.error ?? 'Failed to initialize payment')
      })
      .catch(() => setFetchError('Network error. Please try again.'))
  }, [open, hasStripe, email])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Upgrade to Pro</p>
              <p className="text-[11px] text-slate-400">$9.99 / month · Cancel anytime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* What you get */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {['Unlimited AI Assistant', 'Audio Podcasts', 'Academic Planner'].map((f) => (
              <div key={f} className="flex items-center gap-1 text-[11px] text-slate-500">
                <CheckCircle2 className="h-3 w-3 text-violet-500" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5">
          {!hasStripe ? (
            // Demo mode — Stripe keys not configured
            <DemoCheckoutForm onSuccess={onSuccess} onCancel={onClose} />
          ) : fetchError ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-semibold text-slate-800">Failed to load payment</p>
              <p className="mt-1 text-xs text-slate-500">{fetchError}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Close</Button>
            </div>
          ) : !clientSecret ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="mt-3 text-xs text-slate-400">Initializing secure payment...</p>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#7c3aed',
                    borderRadius: '12px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  },
                },
              }}
            >
              <CheckoutForm email={email} onSuccess={onSuccess} onCancel={onClose} />
            </Elements>
          )}
        </div>
      </motion.div>
    </div>
  )
}
