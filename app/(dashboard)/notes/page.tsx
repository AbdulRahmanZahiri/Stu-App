'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Search, Upload, Eye, Download,
  Plus, Shield, Archive, Users, Clock,
  Sparkles, Loader2, Check, AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getInitials, cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Note } from '@/lib/types'

const labelConfig = {
  verified: { label: 'Verified', icon: Shield, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'student-uploaded': { label: 'Student', icon: Users, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  archived: { label: 'Archived', icon: Archive, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  unofficial: { label: 'Unofficial', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

export default function NotesPage() {
  const { notes, courses, addNote } = useAppStore()
  const { user, profile } = useAuth()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [aiSummary, setAiSummary] = useState<{ noteId: string; content: string } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [newNote, setNewNote] = useState({ title: '', content: '', courseId: '', tags: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = notes.filter((n) => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
      n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    if (tab === 'my') return matchSearch && n.authorId === (user?.id ?? 'student-001')
    if (tab === 'shared') return matchSearch && n.type === 'shared'
    if (tab === 'verified') return matchSearch && n.isVerified
    return matchSearch
  })

  function createNote() {
    if (!newNote.title.trim() || !newNote.content.trim()) return
    const course = courses.find((c) => c.id === newNote.courseId)
    const note: Note = {
      id: crypto.randomUUID(),
      authorId: user?.id ?? 'student-001',
      authorName: profile?.name ?? 'Student',
      courseId: newNote.courseId || undefined,
      courseCode: course?.code,
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      excerpt: newNote.content.trim().slice(0, 120) + '...',
      type: 'personal',
      tags: newNote.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: 'draft',
      isVerified: false,
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    addNote(note)
    setNewNote({ title: '', content: '', courseId: '', tags: '' })
    setShowCreate(false)
  }

  async function uploadNote() {
    if (!uploadFile || !newNote.title.trim()) return
    const course = courses.find((c) => c.id === newNote.courseId)
    setUploading(true)
    let content = `Uploaded file: ${uploadFile.name}`
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const response = await fetch('/api/extract-pdf', { method: 'POST', body: formData })
      const result = await response.json()
      if (response.ok && typeof result.text === 'string') content = result.text
    } catch {
      // The original file is still stored even when text extraction is unavailable.
    }
    const note: Note = {
      id: crypto.randomUUID(),
      authorId: user?.id ?? 'student-001',
      authorName: profile?.name ?? 'Student',
      courseId: newNote.courseId || undefined,
      courseCode: course?.code,
      title: newNote.title.trim(),
      content,
      excerpt: content.slice(0, 160),
      type: 'personal',
      tags: newNote.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: 'draft',
      isVerified: false,
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    addNote(note, uploadFile)
    setUploadFile(null)
    setNewNote({ title: '', content: '', courseId: '', tags: '' })
    setShowUpload(false)
    setUploading(false)
  }

  async function downloadNote(note: Note) {
    if (note.fileUrl) {
      const { data, error } = await supabase.storage.from('notes').createSignedUrl(note.fileUrl, 60)
      if (error || !data?.signedUrl) {
        toast.error(error?.message ?? 'Could not create a download link')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${note.title.replace(/[^a-z0-9-_]+/gi, '-') || 'note'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function generateAISummary(note: Note) {
    setLoadingSummary(note.id)
    setSummaryError(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Please provide a concise AI summary of this note titled "${note.title}"${note.courseCode ? ` from ${note.courseCode}` : ''}. Content: ${note.content || note.excerpt || 'No content available'}. Format it with key points and main takeaways.`
          }]
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAiSummary({ noteId: note.id, content: data.content })
      setViewNote(note)
    } catch {
      setSummaryError(note.id)
    } finally {
      setLoadingSummary(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes & Resources</h1>
          <p className="mt-1 text-sm text-slate-500">Access your notes, upload materials, and browse shared resources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setShowUpload(true); setNewNote({ title: '', content: '', courseId: '', tags: '' }) }}>
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => { setShowCreate(true); setNewNote({ title: '', content: '', courseId: '', tags: '' }) }}>
            <Plus className="h-3.5 w-3.5" />
            New Note
          </Button>
        </div>
      </motion.div>



      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search notes, courses, tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-xl pl-8 text-sm" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="my" className="text-xs">My Notes</TabsTrigger>
            <TabsTrigger value="shared" className="text-xs">Shared</TabsTrigger>
            <TabsTrigger value="verified" className="text-xs">Verified</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Add New Note card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { setShowCreate(true); setNewNote({ title: '', content: '', courseId: '', tags: '' }) }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Plus className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">Add New Note</p>
          <p className="mt-1 text-xs text-emerald-500">Create or upload a note</p>
        </motion.div>

        {filtered.map((note, i) => (
          <motion.div key={note.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.07 }}>
            <NoteCard
              note={note}
              onView={() => { setViewNote(note); setAiSummary(null) }}
              onAISummary={() => generateAISummary(note)}
              loadingSummary={loadingSummary === note.id}
              summaryError={summaryError === note.id}
            />
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border border-slate-100 bg-white py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">No notes found</p>
          <p className="text-xs text-slate-400">Try a different search or create your first note</p>
        </div>
      )}

      {/* View Note Dialog */}
      <Dialog open={!!viewNote} onOpenChange={(o) => { if (!o) { setViewNote(null); setAiSummary(null) } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewNote && (
            <>
              <DialogHeader>
                <DialogTitle>{viewNote.title}</DialogTitle>
                <DialogDescription>
                  {viewNote.courseCode && <span className="font-semibold text-emerald-600">{viewNote.courseCode} · </span>}
                  by {viewNote.authorName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {viewNote.tags && viewNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {viewNote.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{t}</span>)}
                  </div>
                )}
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {viewNote.content || viewNote.excerpt || 'No content available.'}
                </div>

                {/* AI Summary section */}
                {aiSummary?.noteId === viewNote.id && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-emerald-800">AI Summary</p>
                    </div>
                    <p className="text-sm text-emerald-700 whitespace-pre-wrap">{aiSummary.content}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="gradient-subtle"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => generateAISummary(viewNote)}
                    disabled={loadingSummary === viewNote.id}
                  >
                    {loadingSummary === viewNote.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiSummary?.noteId === viewNote.id ? 'Regenerate Summary' : 'AI Summary'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadNote(viewNote)}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Note Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Note</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Title *</Label>
              <Input placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))} autoFocus />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Course</Label>
              <Select value={newNote.courseId} onValueChange={(v) => setNewNote((p) => ({ ...p, courseId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select course (optional)" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Content *</Label>
              <Textarea placeholder="Write your notes here..." value={newNote.content} onChange={(e) => setNewNote((p) => ({ ...p, content: e.target.value }))} className="min-h-[140px]" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Tags (comma separated)</Label>
              <Input placeholder="e.g. trees, algorithms, midterm" value={newNote.tags} onChange={(e) => setNewNote((p) => ({ ...p, tags: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="gradient" size="sm" className="flex-1" onClick={createNote} disabled={!newNote.title.trim() || !newNote.content.trim()}>
                <Check className="h-3.5 w-3.5" />
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Note Dialog */}
      <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.doc,.md" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Note</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div
              onClick={() => fileRef.current?.click()}
              className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all', uploadFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50')}
            >
              {uploadFile ? (
                <>
                  <Check className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-emerald-700">{uploadFile.name}</p>
                  <p className="text-xs text-emerald-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Click to select file</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, MD</p>
                </>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Note Title *</Label>
              <Input placeholder="Give your note a title..." value={newNote.title} onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Course</Label>
              <Select value={newNote.courseId} onValueChange={(v) => setNewNote((p) => ({ ...p, courseId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select course (optional)" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button variant="gradient" size="sm" className="flex-1" onClick={uploadNote} disabled={!uploadFile || !newNote.title.trim() || uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? 'Uploading...' : 'Upload Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NoteCard({ note, onView, onAISummary, loadingSummary, summaryError }: {
  note: Note
  onView: () => void
  onAISummary: () => void
  loadingSummary: boolean
  summaryError: boolean
}) {
  const labelKey = note.isVerified ? 'verified' : note.type === 'shared' ? 'student-uploaded' : note.status === 'archived' ? 'archived' : 'student-uploaded'
  const config = labelConfig[labelKey as keyof typeof labelConfig]
  const LabelIcon = config.icon

  return (
    <Card hover className="group h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <div className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5', config.bg, config.border)}>
            <LabelIcon className={cn('h-3 w-3', config.text)} />
            <span className={cn('text-[10px] font-semibold', config.text)}>{config.label}</span>
          </div>
        </div>
        <div className="flex-1">
          {note.courseCode && <p className="mb-1 text-[11px] font-bold text-emerald-600">{note.courseCode}</p>}
          <h3 className="mb-1.5 text-sm font-semibold leading-snug text-slate-900">{note.title}</h3>
          {note.excerpt && <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">{note.excerpt}</p>}
        </div>
        {note.tags && note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag: string) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{tag}</span>)}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-400 to-green-400 text-white">{getInitials(note.authorName)}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-slate-400">{note.authorName}</span>
          </div>
          <div className="flex items-center gap-2">
            {note.viewCount !== undefined && <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><Eye className="h-3 w-3" />{note.viewCount}</span>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={onView}>
            <Eye className="h-3 w-3 mr-1" />
            View Note
          </Button>
          <Button variant="gradient-subtle" size="sm" className="text-xs h-7 gap-1" onClick={onAISummary} disabled={loadingSummary}>
            {loadingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : summaryError ? <AlertCircle className="h-3 w-3 text-rose-500" /> : <Sparkles className="h-3 w-3" />}
            AI Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
