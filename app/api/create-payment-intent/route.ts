import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return stripe
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
  }

  try {
    const { email } = await req.json()

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: 999,           // $9.99 in cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: 'ScholarFlow Pro — Monthly subscription',
      receipt_email: email ?? undefined,
      metadata: { plan: 'pro' },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('Payment intent error:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}
