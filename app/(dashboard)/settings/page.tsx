'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  User, Bell, Shield, Palette, GraduationCap, LogOut,
  Camera, Save, Check, Plus, Trash2, X, AlertTriangle, Eye, EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { mockStudent } from '@/lib/mock-data'
import { getInitials, cn } from '@/lib/utils'

type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'sf-theme'

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)

  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
}

export default function SettingsPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [goals, setGoals] = useState<string[]>(mockStudent.goals ?? [])
  const [editingGoal, setEditingGoal] = useState<{ index: number; value: string } | null>(null)
  const [newGoalValue, setNewGoalValue] = useState('')
  const [showAddGoal, setShowAddGoal] = useState(false)

  const [notifications, setNotifications] = useState({
    deadlineReminders: true,
    gradeUpdates: true,
    communityMessages: false,
    aiSuggestions: true,
    weeklyDigest: true,
  })

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  const [theme, setTheme] = useState<ThemeMode>('system')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    const initial: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system'

    setTheme(initial)
    applyTheme(initial)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const current = localStorage.getItem(THEME_KEY)
      if ((current ?? 'system') === 'system') {
        applyTheme('system')
      }
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme)
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarUrl(url)
  }

  function addGoal() {
    if (!newGoalValue.trim()) return
    setGoals((p) => [...p, newGoalValue.trim()])
    setNewGoalValue('')
    setShowAddGoal(false)
  }

  function removeGoal(i: number) {
    setGoals((p) => p.filter((_, idx) => idx !== i))
  }

  function saveGoalEdit() {
    if (!editingGoal) return
    setGoals((p) => p.map((g, i) => (i === editingGoal.index ? editingGoal.value : g)))
    setEditingGoal(null)
  }

  function updatePassword() {
    setPwError(null)
    if (!passwords.current) return setPwError('Enter your current password.')
    if (passwords.next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (passwords.next !== passwords.confirm) return setPwError('Passwords do not match.')
    setPwSuccess(true)
    setPasswords({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSuccess(false), 3000)
  }

  function handleSignOut() {
    router.push('/login')
  }

  function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') return
    router.push('/login')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, preferences, and account settings</p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="text-xs gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="academic" className="text-xs gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Academic</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs gap-1.5"><Palette className="h-3.5 w-3.5" />Appearance</TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      {avatarUrl && <AvatarImage src={avatarUrl} />}
                      <AvatarFallback className="text-base bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                        {getInitials(mockStudent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => avatarRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm hover:bg-violet-700 transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{mockStudent.name}</p>
                    <p className="text-xs text-slate-500">Year {mockStudent.year} · {mockStudent.major}</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => avatarRef.current?.click()}>
                      Change Photo
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Full Name</Label><Input defaultValue={mockStudent.name} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Student ID</Label><Input defaultValue={mockStudent.studentId} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Email Address</Label><Input type="email" defaultValue={mockStudent.email} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>University</Label><Input defaultValue={mockStudent.university} className="h-9 rounded-xl" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea defaultValue={mockStudent.bio} className="min-h-[80px] rounded-xl" placeholder="Tell other students about yourself..." />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button variant="gradient" size="sm" onClick={handleSave} className="gap-2 min-w-28">
                {saved ? <><Check className="h-3.5 w-3.5" />Saved!</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Academic */}
        <TabsContent value="academic">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Academic Details</CardTitle>
                <CardDescription>Your program and study preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Major / Program</Label><Input defaultValue={mockStudent.major} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5">
                    <Label>Year of Study</Label>
                    <Select defaultValue={String(mockStudent.year)}>
                      <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{['1','2','3','4','5+'].map((y) => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Current Semester</Label><Input defaultValue={mockStudent.semester} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Expected Graduation</Label><Input defaultValue="Spring 2028" className="h-9 rounded-xl" /></div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-800">Academic Goals</p>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddGoal(true)}>
                      <Plus className="h-3 w-3" />Add Goal
                    </Button>
                  </div>
                  {goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                      {editingGoal?.index === i ? (
                        <>
                          <Input value={editingGoal.value} onChange={(e) => setEditingGoal({ index: i, value: e.target.value })} className="h-7 flex-1 text-xs rounded-lg" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveGoalEdit()} />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveGoalEdit}><Check className="h-3 w-3 text-emerald-500" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingGoal(null)}><X className="h-3 w-3 text-slate-400" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-700">{goal}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-slate-700" onClick={() => setEditingGoal({ index: i, value: goal })}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => removeGoal(i)}><X className="h-3 w-3" /></Button>
                        </>
                      )}
                    </div>
                  ))}
                  {goals.length === 0 && <p className="text-xs text-slate-400 py-2">No goals yet. Add one!</p>}

                  {showAddGoal && (
                    <div className="mt-3 flex gap-2">
                      <Input placeholder="e.g. Maintain 3.8 GPA" value={newGoalValue} onChange={(e) => setNewGoalValue(e.target.value)} className="h-8 flex-1 text-xs rounded-lg" autoFocus onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
                      <Button size="sm" variant="gradient" className="h-8 text-xs px-3" onClick={addGoal}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setShowAddGoal(false); setNewGoalValue('') }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="gradient" size="sm" onClick={handleSave} className="gap-2 min-w-28">
                    {saved ? <><Check className="h-3.5 w-3.5" />Saved!</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notification Preferences</CardTitle>
                <CardDescription>Control how and when ScholarFlow notifies you</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-4">
                  {[
                    { key: 'deadlineReminders', label: 'Deadline Reminders', desc: '24h and 1h before assignments are due' },
                    { key: 'gradeUpdates', label: 'Grade Updates', desc: 'When new grades are posted to your courses' },
                    { key: 'communityMessages', label: 'Community Messages', desc: 'New messages in your chat rooms' },
                    { key: 'aiSuggestions', label: 'AI Study Suggestions', desc: 'Personalized study recommendations' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of upcoming deadlines every Monday' },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><p className="text-sm font-medium text-slate-800">{s.label}</p><p className="text-xs text-slate-400">{s.desc}</p></div>
                      <Switch checked={notifications[s.key as keyof typeof notifications]} onCheckedChange={(v) => setNotifications((n) => ({ ...n, [s.key]: v }))} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Reminder Lead Time</p>
                  <Select defaultValue="24h">
                    <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour before</SelectItem>
                      <SelectItem value="3h">3 hours before</SelectItem>
                      <SelectItem value="24h">24 hours before</SelectItem>
                      <SelectItem value="48h">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700"><strong>Coming soon:</strong> Email and push notifications.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-800 mb-4">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light' as const, label: 'Light', bg: 'bg-white border-slate-200' },
                    { id: 'dark' as const, label: 'Dark', bg: 'bg-slate-900 border-slate-700' },
                    { id: 'system' as const, label: 'System', bg: 'bg-gradient-to-r from-white to-slate-900 border-slate-300' },
                  ].map((t) => (
                    <button key={t.id} onClick={() => changeTheme(t.id)} className={cn('rounded-xl border-2 p-4 transition-all', theme === t.id ? 'border-violet-500 shadow-md' : 'border-slate-200 hover:border-violet-300')}>
                      <div className={cn('h-12 rounded-lg mb-2 border', t.bg)} />
                      <p className="text-xs font-medium text-slate-700">{t.label}</p>
                      {theme === t.id && <div className="mt-1 flex justify-center"><div className="h-1.5 w-1.5 rounded-full bg-violet-500" /></div>}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3">
                  <p className="text-xs text-violet-700">
                    Theme is live now and saves automatically. Current mode: <strong>{theme}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {[
                  { key: 'current' as const, label: 'Current Password' },
                  { key: 'next' as const, label: 'New Password' },
                  { key: 'confirm' as const, label: 'Confirm New Password' },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="mb-1.5 block">{f.label}</Label>
                    <div className="relative">
                      <Input
                        type={showPw[f.key] ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={passwords[f.key]}
                        onChange={(e) => setPasswords((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="h-9 rounded-xl pr-10"
                      />
                      <button type="button" onClick={() => setShowPw((p) => ({ ...p, [f.key]: !p[f.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pwError && <p className="text-xs text-rose-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{pwError}</p>}
                {pwSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" />Password updated successfully!</p>}
                <Button variant="gradient" size="sm" onClick={updatePassword}>Update Password</Button>
              </CardContent>
            </Card>

            <Card className="border-rose-100">
              <CardHeader><CardTitle className="text-sm text-rose-700">Danger Zone</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Sign Out</p>
                    <p className="text-xs text-slate-400">Sign out of your current session</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSignOut}>
                    <LogOut className="h-3.5 w-3.5" />Sign Out
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-rose-700">Delete Account</p>
                    <p className="text-xs text-rose-500">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Delete Account</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p className="text-xs text-rose-700">All your courses, tasks, grades, and notes will be permanently deleted.</p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Type <strong>DELETE</strong> to confirm</Label>
              <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="DELETE" className="h-9 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE'}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
