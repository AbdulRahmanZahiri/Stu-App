'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, ShieldCheck, Building2, UserPlus,
  Search, RefreshCw, Crown, GraduationCap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string
  name: string
  email: string
  university_name: string | null
  major: string | null
  year_of_study: number | null
  gpa: number | null
  is_admin: boolean
  created_at: string
}

interface AdminStats {
  total: number
  newThisWeek: number
  universities: number
  admins: number
}

// ─── Animation helpers ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, gradient, iconBg, textColor,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  gradient: string
  iconBg: string
  textColor: string
}) {
  return (
    <motion.div variants={item}>
      <Card className={`bg-gradient-to-br ${gradient} border-0 shadow-sm`}>
        <CardContent className="p-5 flex items-start gap-4">
          <div className={`${iconBg} rounded-xl p-3 mt-0.5 shrink-0`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`text-3xl font-bold mt-0.5 ${textColor}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // ── Client-side guard (Layer 3) ─────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      router.replace('/dashboard')
    }
  }, [authLoading, profile, router])

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !profile?.is_admin) return

    setLoading(true)
    setError(null)

    fetch('/api/admin')
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        setUsers(data.users)
        setStats(data.stats)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [authLoading, profile, refreshKey])

  // ── Filtered users ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.university_name?.toLowerCase().includes(q) ||
      u.major?.toLowerCase().includes(q)
    )
  }, [users, search])

  // ── Loading / guard states ──────────────────────────────────────────────────
  if (authLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!profile.is_admin) return null   // redirect in progress

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <ShieldCheck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage users and monitor ScholarFlow</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          ⚠️ {error} — make sure you&apos;ve run <code className="font-mono text-xs">supabase/admin_setup.sql</code> in your Supabase dashboard.
        </div>
      )}

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total ?? '—'}
          sub="registered accounts"
          gradient="from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20"
          iconBg="bg-violet-100 dark:bg-violet-900/40"
          textColor="text-violet-700 dark:text-violet-300"
        />
        <StatCard
          icon={UserPlus}
          label="New This Week"
          value={stats?.newThisWeek ?? '—'}
          sub="last 7 days"
          gradient="from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          textColor="text-emerald-700 dark:text-emerald-300"
        />
        <StatCard
          icon={Building2}
          label="Universities"
          value={stats?.universities ?? '—'}
          sub="unique institutions"
          gradient="from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
          textColor="text-blue-700 dark:text-blue-300"
        />
        <StatCard
          icon={ShieldCheck}
          label="Admins"
          value={stats?.admins ?? '—'}
          sub="with admin access"
          gradient="from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          textColor="text-amber-700 dark:text-amber-300"
        />
      </motion.div>

      {/* Users Table */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-500" />
                All Users
                {!loading && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {filtered.length} {search ? 'found' : 'total'}
                  </Badge>
                )}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, university…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading users…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">{search ? 'No users match your search.' : 'No users yet.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                      {['Name', 'Email', 'University', 'Major', 'Year', 'GPA', 'Joined', 'Role'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map(user => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.is_admin && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            {user.name || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                          {user.university_name || <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                          {user.major || <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {user.year_of_study ? `Year ${user.year_of_study}` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {user.gpa != null ? (
                            <span className={`font-semibold ${
                              user.gpa >= 3.5 ? 'text-emerald-600 dark:text-emerald-400' :
                              user.gpa >= 2.5 ? 'text-blue-600 dark:text-blue-400' :
                              'text-amber-600 dark:text-amber-400'
                            }`}>
                              {user.gpa.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {user.is_admin ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 text-xs">
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-500">
                              Student
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
