'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Sparkles,
  FileText,
  MessageSquare,
  GraduationCap,
  Headphones,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Zap,
  Crown,
  Lock,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { mockStudent } from '@/lib/mock-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useState, type ElementType } from 'react'
import { useAppStore } from '@/lib/app-store'

type NavItem = {
  href: string
  label: string
  icon: ElementType
  badge?: string
  highlight?: boolean
  proOnly?: boolean
}

const navItems: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/courses', label: 'Courses', icon: BookOpen },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: '3' },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/grades', label: 'Grades', icon: BarChart3 },
    ],
  },
  {
    group: 'Tools',
    items: [
      { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, highlight: true, proOnly: true },
      { href: '/notes', label: 'Notes & Resources', icon: FileText },
      { href: '/community', label: 'Community', icon: MessageSquare },
      { href: '/planner', label: 'Academic Planner', icon: GraduationCap },
      { href: '/audio', label: 'Audio Study', icon: Headphones, proOnly: true },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { plan } = useAppStore()

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex h-screen flex-col overflow-hidden bg-slate-950 text-white"
      style={{ minWidth: collapsed ? 72 : 260 }}
    >
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-indigo-950/20" />

      {/* Logo */}
      <div className="relative flex h-16 items-center border-b border-white/5 px-4">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-base font-bold tracking-tight text-white"
              >
                Scholar<span className="text-violet-400">Flow</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={onToggle}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-4 sidebar-scroll">
        {navItems.map((group) => (
          <div key={group.group} className="mb-6">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-widest text-white/30"
                >
                  {group.group}
                </motion.p>
              )}
            </AnimatePresence>

            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon
              const isLocked = item.proOnly && plan === 'free'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/90',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-white/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}

                  <div
                    className={cn(
                      'relative flex h-5 w-5 shrink-0 items-center justify-center',
                      isActive && item.highlight && 'text-violet-400',
                      isActive && !item.highlight && 'text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative flex-1 truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {!collapsed && isLocked && (
                    <Lock className="relative h-3 w-3 shrink-0 text-white/25" />
                  )}

                  {!collapsed && !isLocked && item.badge && (
                    <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500/20 px-1.5 text-[10px] font-bold text-violet-300">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                      {item.label}{isLocked ? ' (Pro)' : ''}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Upgrade banner for free users */}
      {plan === 'free' && !collapsed && (
        <div className="relative mx-3 mb-2">
          <Link
            href="/pricing"
            className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-3 py-2.5 transition-opacity hover:opacity-90"
          >
            <Crown className="h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Upgrade to Pro</p>
              <p className="text-[10px] text-violet-200">AI + Podcasts — $9.99/mo</p>
            </div>
          </Link>
        </div>
      )}
      {plan === 'free' && collapsed && (
        <div className="relative mx-2 mb-2">
          <Link
            href="/pricing"
            className="group flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600"
          >
            <Crown className="h-4 w-4 text-amber-300" />
            <div className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
              Upgrade to Pro
            </div>
          </Link>
        </div>
      )}

      {/* Bottom: notifications + user */}
      <div className="relative border-t border-white/5 p-3 space-y-1">
        {plan === 'pro' && (
          <Link
            href="/pricing"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-amber-400/80 transition-all hover:bg-white/5 hover:text-amber-300',
              collapsed && 'justify-center px-0'
            )}
          >
            <Crown className="h-4 w-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Pro Plan
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/50 transition-all hover:bg-white/5 hover:text-white',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <div
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2',
            collapsed && 'justify-center px-0'
          )}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px]">
              {getInitials(mockStudent.name)}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-xs font-semibold text-white">{mockStudent.name}</p>
                <p className="truncate text-[10px] text-white/40">{mockStudent.university.split(' ').slice(0, 2).join(' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
