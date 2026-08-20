'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare,
  GraduationCap, Headphones, ArrowRight, Zap, Star, Users,
  Upload, Brain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Upload,
    color: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    title: 'Syllabus AI Parser',
    description: 'Upload your syllabus and instantly extract deadlines, grades, tasks, and exams.',
  },
  {
    icon: Sparkles,
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    title: 'AI Study Assistant',
    description: 'Get summaries, study guides, flashcards, and quiz questions generated on demand.',
  },
  {
    icon: BarChart3,
    color: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50',
    title: 'Smart Grade Tracker',
    description: 'Track weighted grades, project your final score, and see what you need to succeed.',
  },
  {
    icon: MessageSquare,
    color: 'from-sky-400 to-blue-500',
    bg: 'bg-sky-50',
    title: 'Student Community',
    description: 'Connect with classmates in course-specific groups, share notes, and study together.',
  },
  {
    icon: GraduationCap,
    color: 'from-pink-400 to-rose-500',
    bg: 'bg-pink-50',
    title: 'Academic Planner',
    description: 'Plan your degree path, track requirements, and get course suggestions.',
  },
  {
    icon: Headphones,
    color: 'from-purple-400 to-emerald-500',
    bg: 'bg-purple-50',
    title: 'Audio Study Mode',
    description: 'Turn your notes into podcast-style summaries you can listen to anywhere.',
  },
]

const stats = [
  { value: '1', label: 'Unified Workspace', icon: Users },
  { value: '8+', label: 'Academic Tools', icon: GraduationCap },
  { value: '24/7', label: 'Study Access', icon: Star },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-white/10 bg-white/80 px-6 backdrop-blur-md lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">
            Scholar<span className="text-emerald-600">Flow</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
              Sign In
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button variant="gradient" size="sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16 text-center">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-white to-white" />
          <div className="absolute left-1/2 top-0 h-[800px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-purple-400/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-4xl">
          <motion.h1
            {...fadeUp}
            className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
          >
            Your Academic Life,{' '}
            <span className="text-gradient">
              Supercharged
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-500"
          >
            ScholarFlow is the all-in-one academic portal for university students.
            Upload syllabi, track grades, manage tasks, study with AI, and connect
            with classmates — all in one beautiful platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link href="/onboarding">
              <Button variant="gradient" size="xl" className="w-full sm:w-auto group">
                Start for Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="xl" className="w-full sm:w-auto border-slate-200">
                View Demo
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-16 flex items-center justify-center gap-12"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          className="relative mx-auto mt-16 w-full max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/80">
            <div className="flex h-8 items-center gap-2 bg-slate-100 px-4">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <div className="mx-auto rounded-md bg-white px-16 py-1 text-[10px] text-slate-400">
                scholarflow.app/dashboard
              </div>
            </div>
            {/* Mock dashboard screenshot */}
            <div className="grid grid-cols-[220px_1fr] bg-slate-50 min-h-[360px]">
              {/* Mini sidebar */}
              <div className="bg-slate-950 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white">ScholarFlow</span>
                </div>
                {[
                  { icon: '⬛', label: 'Dashboard', active: true },
                  { icon: '📚', label: 'Courses' },
                  { icon: '✅', label: 'Tasks' },
                  { icon: '📊', label: 'Grades' },
                  { icon: '✨', label: 'AI Assistant' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                      item.active ? 'bg-white/10 text-white' : 'text-white/40'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              {/* Mini content */}
              <div className="p-5">
                <p className="text-sm font-semibold text-slate-900 mb-4">Good morning, Alex 👋</p>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Courses', value: '4', color: 'bg-emerald-100 text-emerald-700' },
                    { label: 'Due Today', value: '2', color: 'bg-amber-100 text-amber-700' },
                    { label: 'GPA', value: '3.72', color: 'bg-emerald-100 text-emerald-700' },
                    { label: 'Study hrs', value: '22h', color: 'bg-sky-100 text-sky-700' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] opacity-70">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-semibold text-slate-500 mb-2">UPCOMING</p>
                    {['COMP 2007 Lab Due', 'COMP 2003 Assign 3', 'ENGL Draft'].map((t) => (
                      <div key={t} className="flex items-center gap-1.5 py-1 border-b border-slate-50 last:border-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-600">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-semibold text-slate-500 mb-2">GRADES</p>
                    {[
                      { c: 'COMP 2003', g: '87%', color: '#6366f1' },
                      { c: 'COMP 2007', g: '91%', color: '#8b5cf6' },
                      { c: 'MATH 2050', g: '78%', color: '#0ea5e9' },
                    ].map((g) => (
                      <div key={g.c} className="flex items-center justify-between py-0.5">
                        <span className="text-[10px] text-slate-600">{g.c}</span>
                        <span className="text-[10px] font-bold" style={{ color: g.color }}>{g.g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">Features</p>
            <h2 className="text-4xl font-extrabold text-slate-900">
              Everything you need to{' '}
              <span className="text-gradient">ace university</span>
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              From syllabus upload to AI study guides — ScholarFlow handles the busywork so you can focus on learning.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 bg-gradient-to-br ${feature.color} bg-clip-text`} style={{ color: 'transparent' }} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-green-600 to-purple-700 p-12 text-center shadow-2xl shadow-emerald-500/25"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              Ready to transform your academic life?
            </h2>
            <p className="mb-8 text-lg text-white/70">
              Bring your courses, deadlines, notes, grades, and study tools into one focused workspace.
            </p>
            <Link href="/onboarding">
              <Button size="xl" className="bg-white text-emerald-700 hover:bg-white/90 shadow-lg font-semibold">
                Get Started — It&apos;s Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              Scholar<span className="text-emerald-600">Flow</span>
            </span>
          </div>
          <p className="text-xs text-slate-400">© 2026 ScholarFlow. Built for students, by students.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600">Terms</Link>
            <a href="mailto:support@scholarflow.app" className="hover:text-slate-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
