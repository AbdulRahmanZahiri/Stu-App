'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  Camera,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LogOut,
  Palette,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { cn, getInitials } from '@/lib/utils'

type ThemeMode = 'light' | 'dark' | 'system'
type SaveSection = 'profile' | 'academic' | 'notifications'
type SaveStatus = 'idle' | 'saving' | 'saved'

const THEME_KEY = 'sf-theme'
const THEME_EVENT = 'scholarflow-theme-change'
const DEFAULT_NOTIFICATIONS = {
  deadlineReminders: true,
  gradeUpdates: true,
  communityMessages: false,
  aiSuggestions: true,
  weeklyDigest: true,
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)

  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
}

function getThemeSnapshot(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function subscribeToTheme(onStoreChange: () => void) {
  const handleChange = () => onStoreChange()
  window.addEventListener('storage', handleChange)
  window.addEventListener(THEME_EVENT, handleChange)
  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(THEME_EVENT, handleChange)
  }
}

function SaveButton({
  status,
  disabled,
  onSave,
}: {
  status: SaveStatus
  disabled: boolean
  onSave: () => void
}) {
  return (
    <Button variant="gradient" size="sm" onClick={onSave} disabled={status === 'saving' || disabled} className="min-w-28 gap-2">
      {status === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving</>}
      {status === 'saved' && <><Check className="h-3.5 w-3.5" />Saved</>}
      {status === 'idle' && <><Save className="h-3.5 w-3.5" />Save Changes</>}
    </Button>
  )
}

export default function SettingsPage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
  }

  if (!profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="mx-auto max-w-lg"><CardContent className="p-8 text-center"><User className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-800">Sign in to manage account settings</p><p className="mt-1 text-sm text-slate-500">Profile, security, and notification settings are available for signed-in accounts.</p></CardContent></Card>
      </div>
    )
  }

  return <SettingsContent key={profile.id} />
}

function SettingsContent() {
  const router = useRouter()
  const { user, profile, signOut, updateProfile } = useAuth()
  const initialProfile = profile!
  const initialPreferences = initialProfile.preferences ?? {}
  const avatarRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url ?? null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: initialProfile.name ?? '',
    studentId: initialProfile.student_id ?? '',
    university: initialProfile.university_name ?? '',
    bio: initialProfile.bio ?? '',
  })
  const [academicForm, setAcademicForm] = useState({
    major: initialProfile.major ?? '',
    year: initialProfile.year_of_study ? String(initialProfile.year_of_study) : '',
    semester: initialProfile.semester ?? '',
    expectedGraduation: initialProfile.expected_graduation ?? '',
  })
  const [goals, setGoals] = useState<string[]>(() => [...(initialProfile.goals ?? [])])
  const [editingGoal, setEditingGoal] = useState<{ index: number; value: string } | null>(null)
  const [newGoalValue, setNewGoalValue] = useState('')
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [notifications, setNotifications] = useState({
    deadlineReminders: typeof initialPreferences.deadlineReminders === 'boolean' ? initialPreferences.deadlineReminders : DEFAULT_NOTIFICATIONS.deadlineReminders,
    gradeUpdates: typeof initialPreferences.gradeUpdates === 'boolean' ? initialPreferences.gradeUpdates : DEFAULT_NOTIFICATIONS.gradeUpdates,
    communityMessages: typeof initialPreferences.communityMessages === 'boolean' ? initialPreferences.communityMessages : DEFAULT_NOTIFICATIONS.communityMessages,
    aiSuggestions: typeof initialPreferences.aiSuggestions === 'boolean' ? initialPreferences.aiSuggestions : DEFAULT_NOTIFICATIONS.aiSuggestions,
    weeklyDigest: typeof initialPreferences.weeklyDigest === 'boolean' ? initialPreferences.weeklyDigest : DEFAULT_NOTIFICATIONS.weeklyDigest,
  })
  const [reminderLeadTime, setReminderLeadTime] = useState(
    typeof initialPreferences.reminderLeadTime === 'string' ? initialPreferences.reminderLeadTime : '24h',
  )
  const [saveStatus, setSaveStatus] = useState<Record<SaveSection, SaveStatus>>({
    profile: 'idle',
    academic: 'idle',
    notifications: 'idle',
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => 'system')

  function changeTheme(nextTheme: ThemeMode) {
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme(nextTheme)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  async function saveSection(section: SaveSection) {
    setSaveError(null)
    setSaveStatus((status) => ({ ...status, [section]: 'saving' }))
    try {
      if (section === 'profile') {
        if (!profileForm.name.trim()) throw new Error('Your name cannot be empty.')
        await updateProfile({
          name: profileForm.name.trim(),
          student_id: profileForm.studentId.trim() || null,
          university_name: profileForm.university.trim() || null,
          bio: profileForm.bio.trim() || null,
        })
      } else if (section === 'academic') {
        const parsedYear = academicForm.year ? Number.parseInt(academicForm.year, 10) : null
        await updateProfile({
          major: academicForm.major.trim() || null,
          year_of_study: Number.isFinite(parsedYear) ? parsedYear : null,
          semester: academicForm.semester.trim() || null,
          expected_graduation: academicForm.expectedGraduation.trim() || null,
          goals: goals.map((goal) => goal.trim()).filter(Boolean),
        })
      } else {
        await updateProfile({
          preferences: { ...notifications, reminderLeadTime },
        })
      }

      setSaveStatus((status) => ({ ...status, [section]: 'saved' }))
      window.setTimeout(() => setSaveStatus((status) => ({ ...status, [section]: 'idle' })), 2000)
    } catch (error) {
      setSaveStatus((status) => ({ ...status, [section]: 'idle' }))
      setSaveError(error instanceof Error ? error.message : 'Unable to save your changes.')
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user) return
    if (!file.type.startsWith('image/')) return setSaveError('Choose a JPG, PNG, WebP, or GIF image.')
    if (file.size > 5 * 1024 * 1024) return setSaveError('Profile images must be smaller than 5 MB.')

    setSaveError(null)
    setAvatarBusy(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${user.id}/avatar.${extension}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const versionedUrl = `${data.publicUrl}?v=${Date.now()}`
      await updateProfile({ avatar_url: versionedUrl })
      setAvatarUrl(versionedUrl)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to upload your profile image.')
    } finally {
      setAvatarBusy(false)
    }
  }

  function addGoal() {
    const goal = newGoalValue.trim()
    if (!goal) return
    setGoals((current) => [...current, goal])
    setNewGoalValue('')
    setShowAddGoal(false)
  }

  function saveGoalEdit() {
    if (!editingGoal) return
    const value = editingGoal.value.trim()
    setGoals((current) => current.map((goal, index) => (index === editingGoal.index ? value : goal)).filter(Boolean))
    setEditingGoal(null)
  }

  async function updatePassword() {
    setPwError(null)
    setPwSuccess(false)
    if (!user?.email) return setPwError('Your account does not have an email address.')
    if (!passwords.current) return setPwError('Enter your current password.')
    if (passwords.next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (passwords.next !== passwords.confirm) return setPwError('Passwords do not match.')
    if (passwords.current === passwords.next) return setPwError('Choose a password you have not already entered.')

    setPasswordBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      })
      if (signInError) throw new Error('Your current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: passwords.next })
      if (error) throw error
      setPasswords({ current: '', next: '', confirm: '' })
      setPwSuccess(true)
      window.setTimeout(() => setPwSuccess(false), 3000)
    } catch (error) {
      setPwError(error instanceof Error ? error.message : 'Unable to update your password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
    router.refresh()
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') return
    setDeleteError(null)
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_current_account')
      if (error) throw error
      try { await signOut() } catch { /* Account is already deleted. */ }
      router.replace('/login?deleted=1')
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this account.')
      setDeleting(false)
    }
  }

  const displayName = profileForm.name || profile?.name || 'Student'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, preferences, and account settings</p>
      </motion.div>

      {saveError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />{saveError}
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="academic" className="gap-1.5 text-xs"><GraduationCap className="h-3.5 w-3.5" />Academic</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs"><Palette className="h-3.5 w-3.5" />Appearance</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Profile Information</CardTitle><CardDescription>Update your personal details</CardDescription></CardHeader>
              <CardContent className="space-y-6 px-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-500 text-base text-white">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <button type="button" onClick={() => avatarRef.current?.click()} disabled={avatarBusy} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60" aria-label="Change profile photo">
                      {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    </button>
                    <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-xs text-slate-500">{academicForm.year ? `Year ${academicForm.year}` : 'Student'}{academicForm.major ? ` · ${academicForm.major}` : ''}</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => avatarRef.current?.click()} disabled={avatarBusy}>Change Photo</Button>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Full Name</Label><Input value={profileForm.name} onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Student ID</Label><Input value={profileForm.studentId} onChange={(event) => setProfileForm((form) => ({ ...form, studentId: event.target.value }))} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Email Address</Label><Input type="email" value={user?.email ?? profile?.email ?? ''} readOnly className="h-9 rounded-xl bg-slate-50 text-slate-500" /></div>
                  <div className="space-y-1.5"><Label>University</Label><Input value={profileForm.university} onChange={(event) => setProfileForm((form) => ({ ...form, university: event.target.value }))} className="h-9 rounded-xl" /></div>
                </div>
                <div className="space-y-1.5"><Label>Bio</Label><Textarea value={profileForm.bio} onChange={(event) => setProfileForm((form) => ({ ...form, bio: event.target.value }))} className="min-h-[80px] rounded-xl" placeholder="Tell other students about yourself..." /></div>
              </CardContent>
            </Card>
            <div className="flex justify-end"><SaveButton status={saveStatus.profile} disabled={!user} onSave={() => void saveSection('profile')} /></div>
          </motion.div>
        </TabsContent>

        <TabsContent value="academic">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader><CardTitle className="text-sm">Academic Details</CardTitle><CardDescription>Your program and study preferences</CardDescription></CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Major / Program</Label><Input value={academicForm.major} onChange={(event) => setAcademicForm((form) => ({ ...form, major: event.target.value }))} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Year of Study</Label><Select value={academicForm.year || undefined} onValueChange={(year) => setAcademicForm((form) => ({ ...form, year }))}><SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent>{['1', '2', '3', '4', '5'].map((year) => <SelectItem key={year} value={year}>Year {year}{year === '5' ? '+' : ''}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Current Semester</Label><Input value={academicForm.semester} onChange={(event) => setAcademicForm((form) => ({ ...form, semester: event.target.value }))} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Expected Graduation</Label><Input value={academicForm.expectedGraduation} onChange={(event) => setAcademicForm((form) => ({ ...form, expectedGraduation: event.target.value }))} className="h-9 rounded-xl" placeholder="Spring 2028" /></div>
                </div>
                <Separator />
                <div>
                  <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Academic Goals</p><Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowAddGoal(true)}><Plus className="h-3 w-3" />Add Goal</Button></div>
                  {goals.map((goal, index) => (
                    <div key={`${goal}-${index}`} className="flex items-center gap-2 border-b border-slate-50 py-2 last:border-0">
                      {editingGoal?.index === index ? (
                        <><Input value={editingGoal.value} onChange={(event) => setEditingGoal({ index, value: event.target.value })} className="h-7 flex-1 rounded-lg text-xs" autoFocus onKeyDown={(event) => event.key === 'Enter' && saveGoalEdit()} /><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveGoalEdit}><Check className="h-3 w-3 text-emerald-500" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingGoal(null)}><X className="h-3 w-3 text-slate-400" /></Button></>
                      ) : (
                        <><span className="flex-1 text-sm text-slate-700">{goal}</span><Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-slate-700" onClick={() => setEditingGoal({ index, value: goal })}>Edit</Button><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => setGoals((current) => current.filter((_, goalIndex) => goalIndex !== index))}><X className="h-3 w-3" /></Button></>
                      )}
                    </div>
                  ))}
                  {goals.length === 0 && <p className="py-2 text-xs text-slate-400">No goals yet. Add one!</p>}
                  {showAddGoal && <div className="mt-3 flex gap-2"><Input placeholder="e.g. Maintain a 3.8 GPA" value={newGoalValue} onChange={(event) => setNewGoalValue(event.target.value)} className="h-8 flex-1 rounded-lg text-xs" autoFocus onKeyDown={(event) => event.key === 'Enter' && addGoal()} /><Button size="sm" variant="gradient" className="h-8 px-3 text-xs" onClick={addGoal}>Add</Button><Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setShowAddGoal(false); setNewGoalValue('') }}><X className="h-3.5 w-3.5" /></Button></div>}
                </div>
                <div className="flex justify-end pt-2"><SaveButton status={saveStatus.academic} disabled={!user} onSave={() => void saveSection('academic')} /></div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle><CardDescription>Save how ScholarFlow should notify you</CardDescription></CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-4">
                  {[
                    { key: 'deadlineReminders', label: 'Deadline Reminders', desc: 'Reminders before assignments are due' },
                    { key: 'gradeUpdates', label: 'Grade Updates', desc: 'When grades are added to your courses' },
                    { key: 'communityMessages', label: 'Community Messages', desc: 'New messages in your chat rooms' },
                    { key: 'aiSuggestions', label: 'AI Study Suggestions', desc: 'Personalized study recommendations' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of upcoming deadlines every Monday' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0"><div><p className="text-sm font-medium text-slate-800">{setting.label}</p><p className="text-xs text-slate-400">{setting.desc}</p></div><Switch checked={notifications[setting.key as keyof typeof notifications]} onCheckedChange={(checked) => setNotifications((current) => ({ ...current, [setting.key]: checked }))} /></div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold text-slate-600">Reminder Lead Time</p><Select value={reminderLeadTime} onValueChange={setReminderLeadTime}><SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1h">1 hour before</SelectItem><SelectItem value="3h">3 hours before</SelectItem><SelectItem value="24h">24 hours before</SelectItem><SelectItem value="48h">48 hours before</SelectItem></SelectContent></Select></div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Preferences are saved, but email &amp; push delivery are not yet active — notifications are in-app only for now.
                  </div>
                  <div className="flex justify-end"><SaveButton status={saveStatus.notifications} disabled={!user} onSave={() => void saveSection('notifications')} /></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="appearance">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card><CardContent className="p-6"><p className="mb-4 text-sm font-semibold text-slate-800">Theme</p><div className="grid grid-cols-3 gap-3">{[
              { id: 'light' as const, label: 'Light', bg: 'bg-white border-slate-200' },
              { id: 'dark' as const, label: 'Dark', bg: 'bg-slate-900 border-slate-700' },
              { id: 'system' as const, label: 'System', bg: 'bg-gradient-to-r from-white to-slate-900 border-slate-300' },
            ].map((option) => <button key={option.id} onClick={() => changeTheme(option.id)} className={cn('rounded-xl border-2 p-4 transition-all', theme === option.id ? 'border-emerald-500 shadow-md' : 'border-slate-200 hover:border-emerald-300')}><div className={cn('mb-2 h-12 rounded-lg border', option.bg)} /><p className="text-xs font-medium text-slate-700">{option.label}</p>{theme === option.id && <div className="mt-1 flex justify-center"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></div>}</button>)}</div><div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Theme saves automatically. Current mode: <strong>{theme}</strong>.</p></div></CardContent></Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Change Password</CardTitle></CardHeader><CardContent className="space-y-4 px-5 pb-5">
              {[
                { key: 'current' as const, label: 'Current Password' },
                { key: 'next' as const, label: 'New Password' },
                { key: 'confirm' as const, label: 'Confirm New Password' },
              ].map((field) => <div key={field.key}><Label className="mb-1.5 block">{field.label}</Label><div className="relative"><Input type={showPw[field.key] ? 'text' : 'password'} placeholder="••••••••" value={passwords[field.key]} onChange={(event) => setPasswords((current) => ({ ...current, [field.key]: event.target.value }))} className="h-9 rounded-xl pr-10" /><button type="button" onClick={() => setShowPw((current) => ({ ...current, [field.key]: !current[field.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={`${showPw[field.key] ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`}>{showPw[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>)}
              {pwError && <p className="flex items-center gap-1 text-xs text-rose-500"><AlertTriangle className="h-3 w-3" />{pwError}</p>}
              {pwSuccess && <p className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" />Password updated successfully.</p>}
              <Button variant="gradient" size="sm" onClick={() => void updatePassword()} disabled={passwordBusy}>{passwordBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Update Password</Button>
            </CardContent></Card>
            <Card className="border-rose-100"><CardHeader><CardTitle className="text-sm text-rose-700">Danger Zone</CardTitle></CardHeader><CardContent className="space-y-3 px-5 pb-5"><div className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-medium text-slate-700">Sign Out</p><p className="text-xs text-slate-400">Sign out of your current session</p></div><Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => void handleSignOut()}><LogOut className="h-3.5 w-3.5" />Sign Out</Button></div><div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3"><div><p className="text-sm font-medium text-rose-700">Delete Account</p><p className="text-xs text-rose-500">Permanently delete your account and all data</p></div><Button variant="destructive" size="sm" className="text-xs" onClick={() => setShowDeleteConfirm(true)}>Delete</Button></div></CardContent></Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="text-rose-700">Delete Account</DialogTitle><DialogDescription>This action is permanent and cannot be undone.</DialogDescription></DialogHeader><div className="mt-2 space-y-4"><div className="rounded-xl border border-rose-100 bg-rose-50 p-3"><p className="text-xs text-rose-700">All your courses, tasks, grades, notes, and uploaded files will be permanently deleted.</p></div><div><Label className="mb-1.5 block text-xs">Type <strong>DELETE</strong> to confirm</Label><Input value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} placeholder="DELETE" className="h-9 rounded-xl" /></div>{deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}<div className="flex gap-2"><Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(null) }} disabled={deleting}>Cancel</Button><Button variant="destructive" size="sm" className="flex-1" onClick={() => void handleDeleteAccount()} disabled={deleteInput !== 'DELETE' || deleting}>{deleting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}Delete Account</Button></div></div></DialogContent>
      </Dialog>
    </div>
  )
}
