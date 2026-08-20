'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Search, Plus, ChevronDown, Menu, BookOpen, CheckSquare, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials, getDueDateStatus } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useAppStore } from '@/lib/app-store'
import { format } from 'date-fns'
import Link from 'next/link'

interface TopbarProps {
  onMobileMenuClick?: () => void
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { tasks, courses, notes } = useAppStore()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const now = new Date()

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []

    const courseResults = courses
      .filter((course) => `${course.code} ${course.name} ${course.instructor ?? ''}`.toLowerCase().includes(term))
      .map((course) => ({ id: `course-${course.id}`, title: `${course.code} · ${course.name}`, subtitle: course.instructor || 'Course', href: '/courses', icon: BookOpen }))
    const taskResults = tasks
      .filter((task) => `${task.title} ${task.description ?? ''} ${task.courseCode ?? ''}`.toLowerCase().includes(term))
      .map((task) => ({ id: `task-${task.id}`, title: task.title, subtitle: task.courseCode || 'General task', href: '/tasks', icon: CheckSquare }))
    const noteResults = notes
      .filter((note) => `${note.title} ${note.content} ${(note.tags ?? []).join(' ')} ${note.courseCode ?? ''}`.toLowerCase().includes(term))
      .map((note) => ({ id: `note-${note.id}`, title: note.title, subtitle: note.courseCode || 'Note', href: '/notes', icon: FileText }))

    return [...courseResults, ...taskResults, ...noteResults].slice(0, 8)
  }, [courses, notes, query, tasks])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        searchInputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        searchInputRef.current?.blur()
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const urgentTasks = tasks.filter((task) => {
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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 backdrop-blur-sm sm:gap-4 sm:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMobileMenuClick}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:block">
        <p className="text-xs font-medium text-slate-400">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div ref={searchContainerRef} className="relative mx-auto hidden max-w-sm flex-1 md:flex">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && searchResults[0]) {
              router.push(searchResults[0].href)
              setSearchOpen(false)
            }
          }}
          placeholder="Search courses, tasks, notes..."
          className="h-8 rounded-xl border-slate-200 bg-slate-50 pl-8 text-xs focus-visible:ring-emerald-500/30"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
        {searchOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => { router.push(result.href); setSearchOpen(false) }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><result.icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-700">{result.title}</span><span className="block truncate text-[10px] text-slate-400">{result.subtitle}</span></span>
              </button>
            ))}
            {searchResults.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">No matching courses, tasks, or notes.</p>}
          </div>
        )}
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
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-4 text-white">
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
              <Link href="/tasks" className="text-xs font-medium text-emerald-700">Open Task Center</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 items-center gap-2 rounded-xl px-2">
              <Avatar className="h-7 w-7">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-500 to-green-500 text-white">
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
