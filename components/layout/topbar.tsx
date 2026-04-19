'use client'

import { Bell, Search, Plus, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mockTasks } from '@/lib/mock-data'
import { getInitials, getDueDateStatus } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import Link from 'next/link'

export function Topbar() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const now = new Date()

  const urgentTasks = mockTasks.filter((task) => {
    if (!task.dueDate || task.status === 'completed') return false
    const status = getDueDateStatus(task.dueDate)
    return status === 'urgent' || status === 'overdue'
  })

  const displayName = profile?.name ?? 'Student'
  const displayEmail = profile?.email ?? ''
  const displayMajor = profile?.major ?? ''
  const displayYear = profile?.year_of_study ? `Year ${profile.year_of_study}` : ''

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-100 bg-white/80 px-6 backdrop-blur-sm">
      <div className="hidden sm:block">
        <p className="text-xs font-medium text-slate-400">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="relative mx-auto hidden max-w-sm flex-1 md:flex">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search courses, tasks, notes..."
          className="h-8 rounded-xl border-slate-200 bg-slate-50 pl-8 text-xs focus-visible:ring-violet-500/30"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="gradient"
          size="sm"
          className="hidden sm:flex h-8 text-xs gap-1.5"
          onClick={() => router.push(`/tasks?compose=${Date.now()}`)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-slate-500">
              <Bell className="h-4 w-4" />
              {urgentTasks.length > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-violet-600 px-1 text-[10px] font-bold leading-4 text-white">
                  {urgentTasks.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {urgentTasks.slice(0, 3).map((task) => (
              <DropdownMenuItem key={task.id} asChild>
                <Link href={task.status === 'overdue' ? '/tasks?filter=overdue' : '/tasks?filter=today'} className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-slate-800">{task.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {task.status === 'overdue' ? 'Overdue' : 'Due today'} · {task.courseCode ?? 'General'}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            {urgentTasks.length === 0 && (
              <DropdownMenuItem asChild>
                <Link href="/tasks" className="text-xs text-slate-500">No urgent alerts. View all tasks.</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/tasks" className="text-xs font-medium text-violet-700">Open Task Center</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 items-center gap-2 rounded-xl px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-slate-700">{displayName}</p>
                <p className="text-[10px] text-slate-400">
                  {[displayYear, displayMajor].filter(Boolean).join(' · ') || 'Student'}
                </p>
              </div>
              <ChevronDown className="hidden h-3 w-3 text-slate-400 sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Profile &amp; Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/grades">Academic Record</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600"
              onClick={handleSignOut}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
