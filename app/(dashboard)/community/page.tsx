'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Users, Hash, Plus, Search, Image as ImageIcon,
  Smile, Paperclip, MoreVertical, X, Check, FileText, Download,
  Languages, Globe, Loader2, Crown, UserMinus, Trash2, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockChatRooms, mockChatMessages } from '@/lib/mock-data'
import { getInitials, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import type { ChatRoom, ChatMessage } from '@/lib/types'

// ── DB row shapes ────────────────────────────────────────────────────────────

type RoomRow = {
  id: string; name: string; type: ChatRoom['type']
  description: string | null; course_code: string | null
  university_name: string | null; color: string | null; created_at: string
  created_by: string | null
}
type MemberRow = { room_id: string; student_id: string; member_name: string | null; role: string }
type MemberInfo = { id: string; name: string; role: 'owner' | 'member'; isOnline: boolean }
type MessageRow = {
  id: string; room_id: string; sender_id: string | null; sender_name: string
  content: string; type: ChatMessage['type']
  file_url: string | null; file_name: string | null
  file_size: number | null; file_mime: string | null
  created_at: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMOJIS = ['😊', '👍', '🎉', '❤️', '😂', '🤔', '👋', '🔥', '💯', '📚', '✅', '⭐', '😅', '🙏', '💪', '🧠']

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
]

const roomTypeIcon: Record<string, React.ElementType> = {
  course: Hash, major: Users, general: MessageSquare, direct: MessageSquare,
}

const ROOM_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const DEFAULT_ROOMS: Array<Pick<RoomRow, 'name' | 'type' | 'description' | 'course_code' | 'university_name' | 'color'>> = [
  { name: 'General Student Lounge', type: 'general', description: 'Open room for all ScholarFlow students', course_code: null, university_name: 'Community', color: '#f59e0b' },
  { name: 'Study Tips & Tricks', type: 'general', description: 'Share your best study strategies', course_code: null, university_name: 'Community', color: '#10b981' },
  { name: 'Exam Prep Room', type: 'general', description: 'Preparing for midterms and finals together', course_code: null, university_name: 'Community', color: '#8b5cf6' },
  { name: 'CS Major Chat', type: 'major', description: 'Computer Science students worldwide', course_code: null, university_name: 'Community', color: '#6366f1' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapRoom(row: RoomRow, memberCount: number): ChatRoom {
  return {
    id: row.id, name: row.name, type: row.type,
    description: row.description ?? undefined,
    courseCode: row.course_code ?? undefined,
    university: row.university_name ?? undefined,
    memberCount, unreadCount: 0,
    color: row.color ?? '#6366f1',
    createdAt: new Date(row.created_at),
    createdBy: row.created_by ?? undefined,
  }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateSep(d: Date) {
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id, roomId: row.room_id,
    senderId: row.sender_id ?? 'unknown',
    senderName: row.sender_name,
    content: row.content, type: row.type,
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    fileMime: row.file_mime ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const resp = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=auto|${targetLang}`
  )
  const json = await resp.json() as { responseData: { translatedText: string } }
  return json.responseData.translatedText
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [myRoomIds, setMyRoomIds] = useState<Set<string>>(new Set())
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [browseSearch, setBrowseSearch] = useState('')
  const [showBrowse, setShowBrowse] = useState(false)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(true)
  const [roomMembersList, setRoomMembersList] = useState<MemberInfo[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [chatMode, setChatMode] = useState<'realtime' | 'demo'>('demo')
  const [chatError, setChatError] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState('en')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState<Record<string, boolean>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const { user, profile } = useAuth()
  const authUserId = user?.id ?? null
  const currentUser = {
    id: user?.id ?? 'demo',
    name: profile?.name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student',
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeRoomRef = useRef<string | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [newRoom, setNewRoom] = useState({ name: '', type: 'general' as ChatRoom['type'], description: '', color: '#6366f1' })

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null
  const roomMessages = useMemo(() => activeRoomId
    ? allMessages.filter((m) => m.roomId === activeRoomId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [], [activeRoomId, allMessages])
  const myRooms = rooms.filter((r) => myRoomIds.has(r.id))
  const filteredRooms = myRooms.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  const browseRooms = rooms.filter((r) => !browseSearch || r.name.toLowerCase().includes(browseSearch.toLowerCase()))
  const selectedLangData = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0]

  useEffect(() => { activeRoomRef.current = activeRoomId }, [activeRoomId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [roomMessages, activeRoomId])

  // ── Demo fallback ──────────────────────────────────────────────────────────
  const setDemoMode = useCallback((reason?: string) => {
    setChatMode('demo')
    setChatError(reason ?? null)
    setRooms(mockChatRooms)
    setActiveRoomId((prev) => prev ?? mockChatRooms[0]?.id ?? null)
    setAllMessages(mockChatMessages)
    setLoadingRooms(false)
  }, [])

  // ── DB helpers ─────────────────────────────────────────────────────────────
  const ensureMembership = useCallback(async (roomId: string, userId: string, name?: string, role = 'member') => {
    await supabase.from('room_members').upsert(
      { room_id: roomId, student_id: userId, member_name: name ?? null, role },
      { onConflict: 'room_id,student_id', ignoreDuplicates: true }
    )
  }, [])

  const fetchRoomMembers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('room_members').select('student_id,role,member_name').eq('room_id', roomId)
    setRoomMembersList(
      (data ?? []).map((m) => {
        const row = m as MemberRow
        return { id: row.student_id, name: row.member_name ?? 'Member', role: (row.role ?? 'member') as 'owner' | 'member', isOnline: false }
      })
    )
  }, [])

  const fetchMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id,room_id,sender_id,sender_name,content,type,file_url,file_name,file_size,file_mime,created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const mapped = (data ?? []).map((row) => mapMessage(row as MessageRow))
    setAllMessages((prev) => [...prev.filter((m) => m.roomId !== roomId), ...mapped])
  }, [])

  const refreshRooms = useCallback(async (userId: string, preserveActive = true) => {
    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id,name,type,description,course_code,university_name,color,created_at,created_by')
      .order('created_at', { ascending: true })
    if (roomError) throw roomError

    const roomRows = (roomData ?? []) as RoomRow[]
    if (roomRows.length === 0) { setRooms([]); setMyRoomIds(new Set()); setActiveRoomId(null); setAllMessages([]); return }

    const { data: memberData } = await supabase
      .from('room_members').select('room_id,student_id,role,member_name').in('room_id', roomRows.map((r) => r.id))

    const counts = (memberData ?? []).reduce<Record<string, number>>((acc, item) => {
      const row = item as MemberRow
      acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
      return acc
    }, {})

    const joined = new Set(
      (memberData ?? []).filter((item) => (item as MemberRow).student_id === userId).map((item) => (item as MemberRow).room_id)
    )
    setMyRoomIds(joined)

    const mappedRooms = roomRows.map((r) => mapRoom(r, counts[r.id] ?? 0))
    setRooms(mappedRooms)

    if (preserveActive && activeRoomRef.current && joined.has(activeRoomRef.current)) {
      // Stay in current room
      if (activeRoomRef.current) await fetchMessages(activeRoomRef.current)
    } else {
      const firstJoined = mappedRooms.find((r) => joined.has(r.id))
      if (firstJoined) { setActiveRoomId(firstJoined.id); await fetchMessages(firstJoined.id) }
      else setActiveRoomId(null)
    }
  }, [fetchMessages])

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUserId) { setDemoMode(); return }
    let cancelled = false

    async function init() {
      setLoadingRooms(true)
      try {
        const { count, error: countError } = await supabase
          .from('chat_rooms').select('*', { head: true, count: 'exact' })
        if (countError) throw countError
        if ((count ?? 0) === 0) {
          const { error: seedError } = await supabase.from('chat_rooms').insert(DEFAULT_ROOMS)
          if (seedError) throw seedError
        }
        await refreshRooms(authUserId!)
        // Back-fill member_name for existing null rows belonging to this user
        void supabase.from('room_members')
          .update({ member_name: profile?.name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student' })
          .eq('student_id', authUserId!).is('member_name', null)
        if (!cancelled) { setChatMode('realtime'); setChatError(null); setLoadingRooms(false) }
      } catch (err) {
        if (!cancelled) setDemoMode(getErrorMessage(err))
      }
    }
    init()
    return () => { cancelled = true }
  }, [authUserId, refreshRooms, setDemoMode])

  // ── Realtime: rooms ────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatMode !== 'realtime' || !authUserId) return
    const channel = supabase.channel(`rooms-${authUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => { void refreshRooms(authUserId, true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, () => { void refreshRooms(authUserId, true) })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [authUserId, chatMode, refreshRooms])

  // ── Realtime: messages in active room ─────────────────────────────────────
  useEffect(() => {
    if (chatMode !== 'realtime' || !activeRoomId) return
    const channel = supabase.channel(`msg-${activeRoomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          const incoming = mapMessage(payload.new as MessageRow)
          setAllMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming])
        })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [activeRoomId, chatMode])

  // ── Switch room ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatMode !== 'realtime' || !activeRoomId) return
    let cancelled = false
    async function load() {
      try {
        await fetchMessages(activeRoomId!)
        await fetchRoomMembers(activeRoomId!)
      }
      catch (err) { if (!cancelled) setChatError(getErrorMessage(err)) }
    }
    load()
    return () => { cancelled = true }
  }, [activeRoomId, chatMode, fetchMessages, fetchRoomMembers])

  // ── Presence / typing indicators ───────────────────────────────────────────
  useEffect(() => {
    if (chatMode !== 'realtime' || !activeRoomId || !authUserId) return
    if (presenceChannelRef.current) void supabase.removeChannel(presenceChannelRef.current)

    const ch = supabase.channel(`presence-${activeRoomId}`, { config: { presence: { key: authUserId } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ typing: boolean; name: string }>()
      const typers = Object.values(state).flat()
        .filter((p) => p.typing && (p as { typing: boolean; name: string } & { presence_ref?: string }).presence_ref !== authUserId)
        .map((p) => p.name)
        .filter(Boolean)
      setTypingUsers(typers)
      // Mark online members
      const onlineIds = new Set(Object.keys(state))
      setRoomMembersList((prev) => prev.map((m) => ({ ...m, isOnline: onlineIds.has(m.id) })))
    })
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ typing: false, name: currentUser.name })
    })
    presenceChannelRef.current = ch
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      void supabase.removeChannel(ch)
      presenceChannelRef.current = null
      setTypingUsers([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, chatMode, authUserId])

  // ── Typing indicator ──────────────────────────────────────────────────────
  function handleInputChange(value: string) {
    setInput(value)
    if (chatMode !== 'realtime' || !presenceChannelRef.current) return
    void presenceChannelRef.current.track({ typing: true, name: currentUser.name })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      void presenceChannelRef.current?.track({ typing: false, name: currentUser.name })
    }, 2500)
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(
    text: string,
    msgType: ChatMessage['type'] = 'text',
    attachment?: { fileUrl: string; fileName: string; fileSize: number; fileMime: string }
  ) {
    const content = text.trim()
    if (!content || !activeRoom) return

    if (chatMode === 'demo' || !authUserId) {
      const m: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`, roomId: activeRoom.id,
        senderId: currentUser.id, senderName: currentUser.name,
        content, type: msgType, ...attachment, createdAt: new Date(),
      }
      setAllMessages((prev) => [...prev, m])
      setInput(''); setShowEmoji(false)
      return
    }

    try {
      const { data, error } = await supabase.from('chat_messages')
        .insert({
          room_id: activeRoom.id, sender_id: authUserId,
          sender_name: currentUser.name, content, type: msgType,
          file_url: attachment?.fileUrl ?? null,
          file_name: attachment?.fileName ?? null,
          file_size: attachment?.fileSize ?? null,
          file_mime: attachment?.fileMime ?? null,
        })
        .select('id,room_id,sender_id,sender_name,content,type,file_url,file_name,file_size,file_mime,created_at')
        .single()
      if (error) throw error
      if (data) {
        const mapped = mapMessage(data as MessageRow)
        setAllMessages((prev) => prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped])
      }
      setInput(''); setShowEmoji(false); setChatError(null)
    } catch (err) { setChatError(getErrorMessage(err)) }
  }

  // ── File upload ────────────────────────────────────────────────────────────
  async function handleFileAttach(file: File) {
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) { setChatError('Only images and PDFs can be shared.'); return }
    if (file.size > 20 * 1024 * 1024) { setChatError('File must be under 20 MB.'); return }

    if (chatMode === 'demo' || !authUserId) {
      const demoUrl = isImage ? URL.createObjectURL(file) : ''
      await sendMessage(file.name, isImage ? 'image' : 'file', {
        fileUrl: demoUrl, fileName: file.name, fileSize: file.size, fileMime: file.type,
      })
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${activeRoomId}/${authUserId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path)
      await sendMessage(file.name, isImage ? 'image' : 'file', {
        fileUrl: publicUrl, fileName: file.name, fileSize: file.size, fileMime: file.type,
      })
    } catch (err) {
      setChatError(getErrorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Translate ──────────────────────────────────────────────────────────────
  async function handleTranslate(msgId: string, text: string) {
    if (selectedLang === 'en' && !translations[msgId]) return
    if (translations[msgId]) {
      setTranslations((prev) => { const next = { ...prev }; delete next[msgId]; return next })
      return
    }
    setTranslating((prev) => ({ ...prev, [msgId]: true }))
    try {
      const translated = await translateText(text, selectedLang)
      setTranslations((prev) => ({ ...prev, [msgId]: translated }))
    } catch {
      setChatError('Translation failed. Try again.')
    } finally {
      setTranslating((prev) => { const next = { ...prev }; delete next[msgId]; return next })
    }
  }

  // ── Create room ────────────────────────────────────────────────────────────
  async function createRoom() {
    if (!newRoom.name.trim()) return
    if (chatMode === 'demo' || !authUserId) {
      const room: ChatRoom = {
        id: `room-${Date.now()}`, name: newRoom.name.trim(), type: newRoom.type,
        description: newRoom.description.trim() || undefined, memberCount: 1,
        color: newRoom.color, unreadCount: 0, createdAt: new Date(),
      }
      setRooms((prev) => [...prev, room]); setActiveRoomId(room.id)
      setNewRoom({ name: '', type: 'general', description: '', color: '#6366f1' }); setShowCreateRoom(false)
      return
    }
    try {
      const { data, error } = await supabase.from('chat_rooms')
        .insert({ name: newRoom.name.trim(), type: newRoom.type, description: newRoom.description.trim() || null, color: newRoom.color, university_name: 'Community', created_by: authUserId })
        .select('id,name,type,description,course_code,university_name,color,created_at,created_by').single()
      if (error || !data) throw error ?? new Error('Failed to create room.')
      await supabase.from('room_members').insert({ room_id: data.id, student_id: authUserId, member_name: currentUser.name, role: 'owner' })
      await refreshRooms(authUserId, true)
      setActiveRoomId(data.id)
      setNewRoom({ name: '', type: 'general', description: '', color: '#6366f1' }); setShowCreateRoom(false); setChatError(null)
    } catch (err) { setChatError(getErrorMessage(err)) }
  }

  async function joinRoom(roomId: string) {
    if (!authUserId) return
    setJoiningRoomId(roomId)
    try {
      await ensureMembership(roomId, authUserId, currentUser.name, 'member')
      setMyRoomIds((prev) => new Set([...prev, roomId]))
      await fetchMessages(roomId)
      await fetchRoomMembers(roomId)
      setActiveRoomId(roomId)
      setShowBrowse(false)
      setBrowseSearch('')
    } catch (err) { setChatError(getErrorMessage(err)) }
    finally { setJoiningRoomId(null) }
  }

  async function handleKickMember(memberId: string) {
    if (!activeRoomId || !authUserId) return
    if (activeRoom?.createdBy !== authUserId) return
    try {
      const { error } = await supabase.from('room_members').delete()
        .eq('room_id', activeRoomId).eq('student_id', memberId)
      if (error) throw error
      setRoomMembersList((prev) => prev.filter((m) => m.id !== memberId))
      void refreshRooms(authUserId, true)
    } catch (err) { setChatError(getErrorMessage(err)) }
  }

  async function handleDeleteRoom() {
    if (!activeRoomId || !authUserId) return
    if (activeRoom?.createdBy !== authUserId) return
    try {
      const { error } = await supabase.from('chat_rooms').delete().eq('id', activeRoomId)
      if (error) throw error
      setMyRoomIds((prev) => { const next = new Set(prev); next.delete(activeRoomId); return next })
      setShowRoomInfo(false)
      await refreshRooms(authUserId, false)
    } catch (err) { setChatError(getErrorMessage(err)) }
  }

  async function handleLeaveRoom() {
    if (!activeRoomId) return
    if (chatMode === 'demo' || !authUserId) {
      setMyRoomIds((prev) => { const next = new Set(prev); next.delete(activeRoomId); return next })
      setActiveRoomId(null); setShowRoomInfo(false); return
    }
    try {
      const { error } = await supabase.from('room_members').delete().eq('room_id', activeRoomId).eq('student_id', authUserId)
      if (error) throw error
      setMyRoomIds((prev) => { const next = new Set(prev); next.delete(activeRoomId); return next })
      const nextRoom = myRooms.find((r) => r.id !== activeRoomId)
      setActiveRoomId(nextRoom?.id ?? null)
      setShowRoomInfo(false); setChatError(null)
    } catch (err) { setChatError(getErrorMessage(err)) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Image lightbox */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-[calc(100vh-64px)]">
        {/* ── Left panel: room list ──────────────────────────────────────────── */}
        <div className="flex w-72 shrink-0 flex-col border-r border-slate-100 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-sm font-bold text-slate-900">Community</h1>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowCreateRoom(true)} title="Create room">
                <Plus className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search rooms..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border-slate-100 bg-slate-50 pl-8 text-xs" />
            </div>
            {loadingRooms && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400">Connecting...</span>
              </div>
            )}
            {chatError && <p className="mt-2 text-[11px] text-rose-500 leading-tight">{chatError}</p>}
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">My Rooms</p>
              <button onClick={() => setShowBrowse(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                <Search className="h-3 w-3" />
                Browse
              </button>
            </div>
            {filteredRooms.map((room) => {
              const Icon = roomTypeIcon[room.type] ?? MessageSquare
              const isActive = activeRoom?.id === room.id
              return (
                <button key={room.id} onClick={() => setActiveRoomId(room.id)}
                  className={cn('mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50')}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: (room.color ?? '#6366f1') + '20' }}>
                    <Icon className="h-4 w-4" style={{ color: room.color ?? '#6366f1' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{room.name}</p>
                    <p className="truncate text-[10px] text-slate-400">{room.memberCount} members</p>
                  </div>
                  {(room.unreadCount ?? 0) > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                      {room.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
            {!loadingRooms && filteredRooms.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-slate-400">No rooms joined yet</p>
                <button onClick={() => setShowBrowse(true)}
                  className="mt-1.5 text-[11px] font-medium text-emerald-600 hover:underline">
                  Browse all rooms →
                </button>
              </div>
            )}
          </ScrollArea>

          {/* User footer */}
          <div className="border-t border-slate-100 p-3 space-y-2">
            {/* Language picker */}
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger className="h-7 flex-1 rounded-lg border-slate-100 bg-slate-50 text-[11px] px-2">
                  <SelectValue>
                    <span>{selectedLangData.flag} {selectedLangData.label}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      {l.flag} {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-500 text-[10px] text-white">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{currentUser.name}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel: chat area ─────────────────────────────────────────── */}
        <div className="flex flex-1 min-w-0 flex-col bg-slate-50">
          {activeRoom ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: (activeRoom.color ?? '#6366f1') + '20' }}>
                    {(() => { const Icon = roomTypeIcon[activeRoom.type] ?? MessageSquare; return <Icon className="h-5 w-5" style={{ color: activeRoom.color }} /> })()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activeRoom.name}</p>
                    <p className="text-xs text-slate-400">{activeRoom.memberCount} members · {activeRoom.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLang !== 'en' && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Languages className="h-3 w-3" />
                      Auto-translating to {selectedLangData.flag}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{activeRoom.courseCode ?? activeRoom.type}</Badge>
                  <Button variant="ghost" size="icon-sm" title="Members" onClick={() => setShowMembers((v) => !v)}
                    className={showMembers ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}>
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowRoomInfo(true)}>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Messages + Members panel */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 px-4 py-4 md:px-6">
                {roomMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="mb-3 h-10 w-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400">Be the first to say something!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {roomMessages.map((msg, i) => {
                      const isMe = msg.senderId === currentUser.id
                      const prevMsg = roomMessages[i - 1]
                      const showDateSeparator = i === 0 || !isSameDay(new Date(msg.createdAt), new Date(roomMessages[i - 1].createdAt))
                      const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId || showDateSeparator)
                      const showName = showAvatar
                      const isImage = msg.type === 'image'
                      const isFile = msg.type === 'file'
                      const hasTranslation = !!translations[msg.id]
                      const isTranslating = !!translating[msg.id]

                      return (
                        <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                              {formatDateSep(new Date(msg.createdAt))}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.2) }}
                          className={cn('flex items-end gap-2 pt-1', isMe && 'flex-row-reverse')}>

                          {/* Avatar */}
                          <div className={cn('h-8 w-8 shrink-0', !showAvatar && !isMe && 'invisible')}>
                            {showAvatar && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-[10px] text-white">
                                  {getInitials(msg.senderName)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>

                          {/* Bubble */}
                          <div className={cn('flex max-w-[65%] flex-col gap-0.5', isMe && 'items-end')}>
                            {showName && !isMe && (
                              <p className="px-1 text-[11px] font-semibold text-slate-500">{msg.senderName}</p>
                            )}

                            <div className="group relative">
                              {/* Image message */}
                              {isImage && msg.fileUrl && (
                                <button onClick={() => setPreviewImage(msg.fileUrl!)} className="block overflow-hidden rounded-2xl hover:opacity-90 transition-opacity">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={msg.fileUrl} alt={msg.fileName ?? 'image'}
                                    className="max-h-64 max-w-xs rounded-2xl object-cover" />
                                </button>
                              )}

                              {/* File message */}
                              {isFile && (
                                <a href={msg.fileUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                                  className={cn('flex items-center gap-3 rounded-2xl px-4 py-3',
                                    isMe ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white' : 'bg-white border border-slate-100 shadow-sm text-slate-800')}>
                                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isMe ? 'bg-white/20' : 'bg-slate-100')}>
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">{msg.fileName ?? msg.content}</p>
                                    {msg.fileSize && <p className={cn('text-[10px]', isMe ? 'text-white/70' : 'text-slate-400')}>{formatBytes(msg.fileSize)}</p>}
                                  </div>
                                  <Download className="h-4 w-4 shrink-0 opacity-60" />
                                </a>
                              )}

                              {/* Text message */}
                              {!isImage && !isFile && (
                                <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                                  isMe ? 'rounded-br-sm bg-gradient-to-br from-emerald-600 to-green-600 text-white'
                                    : 'rounded-bl-sm border border-slate-100 bg-white text-slate-800 shadow-sm')}>
                                  {msg.content}
                                </div>
                              )}

                              {/* Translation output */}
                              {hasTranslation && (
                                <div className={cn('mt-1 rounded-xl px-3 py-2 text-xs leading-relaxed italic border',
                                  isMe ? 'bg-emerald-700/30 border-emerald-500/30 text-emerald-100' : 'bg-blue-50 border-blue-100 text-blue-700')}>
                                  {translations[msg.id]}
                                </div>
                              )}

                              {/* Translate button (appears on hover, only for text messages) */}
                              {!isImage && !isFile && (
                                <button
                                  onClick={() => void handleTranslate(msg.id, msg.content)}
                                  className={cn(
                                    'mt-0.5 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
                                    isMe ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-slate-600',
                                    (isTranslating || selectedLang === 'en') && 'pointer-events-none'
                                  )}
                                  disabled={selectedLang === 'en'}
                                  title={selectedLang === 'en' ? 'Pick a language in the sidebar to translate' : hasTranslation ? 'Hide translation' : `Translate to ${selectedLangData.label}`}
                                >
                                  {isTranslating
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Languages className="h-3 w-3" />}
                                  {isTranslating ? 'Translating...' : hasTranslation ? 'Hide' : selectedLang === 'en' ? '' : `→ ${selectedLangData.flag}`}
                                </button>
                              )}
                            </div>

                            <p className={cn('px-1 text-[10px] text-slate-400', isMe && 'text-right')}>
                              {format(new Date(msg.createdAt), 'h:mm a')}
                            </p>
                          </div>
                        </motion.div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Members panel */}
              {showMembers && (
                <div className="hidden md:flex w-56 shrink-0 flex-col border-l border-slate-100 bg-white overflow-y-auto">
                  <div className="px-3 pt-4 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Members — {roomMembersList.length}
                    </p>
                  </div>
                  {/* Owners */}
                  {roomMembersList.filter((m) => m.role === 'owner').length > 0 && (
                    <>
                      <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-500">Owner</p>
                      {roomMembersList.filter((m) => m.role === 'owner').map((m) => (
                        <div key={m.id} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
                          <div className="relative shrink-0">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-400 text-[9px] text-white">
                                {getInitials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white', m.isOnline ? 'bg-emerald-400' : 'bg-slate-300')} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-slate-700">{m.name}</p>
                          </div>
                          <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                        </div>
                      ))}
                    </>
                  )}
                  {/* Members */}
                  {roomMembersList.filter((m) => m.role !== 'owner').length > 0 && (
                    <>
                      <p className="px-3 py-1 mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Members</p>
                      {roomMembersList.filter((m) => m.role !== 'owner').map((m) => (
                        <div key={m.id} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
                          <div className="relative shrink-0">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-[9px] text-white">
                                {getInitials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white', m.isOnline ? 'bg-emerald-400' : 'bg-slate-300')} />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{m.name}</p>
                          {activeRoom.createdBy === authUserId && m.id !== authUserId && (
                            <button onClick={() => void handleKickMember(m.id)}
                              title="Remove from room"
                              className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                              <UserMinus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {roomMembersList.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-slate-400">No members loaded</p>
                  )}
                </div>
              )}
              </div>{/* end messages+members flex row */}

              {/* Emoji picker */}
              <AnimatePresence>
                {showEmoji && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="mx-4 mb-2 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-md">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => setInput((prev) => prev + emoji)}
                        className="text-xl transition-transform hover:scale-125">{emoji}</button>
                    ))}
                    <button onClick={() => setShowEmoji(false)} className="ml-auto text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input bar */}
              <div className="border-t border-slate-100 bg-white p-4">
                {typingUsers.length > 0 && (
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="flex gap-0.5">
                      {[0,1,2].map((k) => (
                        <span key={k} className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${k * 0.15}s` }} />
                      ))}
                    </span>
                    <span><strong className="text-slate-500">{typingUsers.slice(0, 2).join(', ')}</strong>{typingUsers.length > 2 ? ` +${typingUsers.length - 2} more` : ''} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
                  </div>
                )}
                {uploading && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading file...
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileAttach(f) }}
                />
                <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all focus-within:border-emerald-300 focus-within:bg-white">
                  <Textarea
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(input) } }}
                    placeholder={`Message ${activeRoom.name}...`}
                    className="min-h-[40px] max-h-24 flex-1 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-500"
                      onClick={() => setShowEmoji((v) => !v)} title="Emoji">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500"
                      onClick={() => fileRef.current?.click()} title="Attach image or PDF" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-violet-500"
                      onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() } }} title="Send image">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white"
                      onClick={() => void sendMessage(input)} disabled={!input.trim() || uploading}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-300">
                  Share images & PDFs · {selectedLang !== 'en' ? `Hover a message → translate to ${selectedLangData.flag}` : 'Pick a language in the sidebar to translate messages'}
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Join a room to start chatting</p>
                <p className="text-xs text-slate-400 mb-4">Browse public rooms or create your own.</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => setShowBrowse(true)}>
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    Browse Rooms
                  </Button>
                  <Button size="sm" variant="gradient" onClick={() => setShowCreateRoom(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Room
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create room dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Room</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Room Name *</Label>
              <Input placeholder="e.g. COMP 3001 Study Group" value={newRoom.name}
                onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Type</Label>
              <Select value={newRoom.type} onValueChange={(v) => setNewRoom((p) => ({ ...p, type: v as ChatRoom['type'] }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">💬 General</SelectItem>
                  <SelectItem value="course">📚 Course</SelectItem>
                  <SelectItem value="major">🎓 Major</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Description</Label>
              <Input placeholder="What's this room about?" value={newRoom.description}
                onChange={(e) => setNewRoom((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Color</Label>
              <div className="flex gap-2">
                {ROOM_COLORS.map((color) => (
                  <button key={color} onClick={() => setNewRoom((p) => ({ ...p, color }))}
                    className={cn('h-7 w-7 rounded-full transition-all', newRoom.color === color ? 'scale-110 ring-2 ring-emerald-500 ring-offset-2' : 'hover:scale-105')}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCreateRoom(false)}>Cancel</Button>
              <Button variant="gradient" size="sm" className="flex-1" onClick={() => void createRoom()} disabled={!newRoom.name.trim()}>
                <Check className="h-3.5 w-3.5" />
                Create Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Browse rooms dialog ───────────────────────────────────────────── */}
      <Dialog open={showBrowse} onOpenChange={setShowBrowse}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Browse Rooms</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search by room name..." value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                className="pl-8" autoFocus />
            </div>
            <ScrollArea className="h-72">
              <div className="space-y-1.5 pr-2">
                {browseRooms.map((room) => {
                  const Icon = roomTypeIcon[room.type] ?? MessageSquare
                  const isMember = myRoomIds.has(room.id)
                  const isJoining = joiningRoomId === room.id
                  return (
                    <div key={room.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: (room.color ?? '#6366f1') + '20' }}>
                        <Icon className="h-4 w-4" style={{ color: room.color ?? '#6366f1' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{room.name}</p>
                        {room.description && <p className="truncate text-[10px] text-slate-400">{room.description}</p>}
                        <p className="text-[10px] text-slate-400">{room.memberCount} members</p>
                      </div>
                      {isMember ? (
                        <Button size="sm" variant="outline" className="shrink-0 h-7 px-2.5 text-xs text-emerald-600 border-emerald-200"
                          onClick={() => { setActiveRoomId(room.id); setShowBrowse(false); setBrowseSearch('') }}>
                          <Check className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      ) : (
                        <Button size="sm" variant="gradient" className="shrink-0 h-7 px-2.5 text-xs"
                          onClick={() => void joinRoom(room.id)} disabled={isJoining}>
                          {isJoining ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Join'}
                        </Button>
                      )}
                    </div>
                  )
                })}
                {browseRooms.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">No rooms match your search.</p>
                )}
              </div>
            </ScrollArea>
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setShowBrowse(false); setShowCreateRoom(true) }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create a new room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Room info dialog ───────────────────────────────────────────────── */}
      <Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{activeRoom?.name}</DialogTitle></DialogHeader>
          {activeRoom && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: (activeRoom.color ?? '#6366f1') + '20' }}>
                  {(() => { const Icon = roomTypeIcon[activeRoom.type] ?? MessageSquare; return <Icon className="h-5 w-5" style={{ color: activeRoom.color }} /> })()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeRoom.name}</p>
                  <p className="text-xs text-slate-400">{activeRoom.memberCount} members · {activeRoom.type}</p>
                </div>
              </div>
              {activeRoom.description && <p className="text-sm text-slate-600">{activeRoom.description}</p>}
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
                <strong>Open room</strong> — any ScholarFlow user can join and see all messages.
              </div>
              {activeRoom.createdBy === authUserId && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700 flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>You are the <strong>owner</strong> of this room. You can remove members and delete the room.</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => void handleLeaveRoom()}>
                  Leave Room
                </Button>
                {activeRoom.createdBy === authUserId && (
                  <Button size="sm" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                    onClick={() => void handleDeleteRoom()}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Room
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
