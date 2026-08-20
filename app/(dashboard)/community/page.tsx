'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Users, Hash, Plus, Search,
  Smile, Paperclip, MoreVertical, X, Check,
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

type RoomRow = {
  id: string
  name: string
  type: ChatRoom['type']
  description: string | null
  course_code: string | null
  university_name: string | null
  color: string | null
  created_at: string
}

type MemberRow = {
  room_id: string
  student_id: string
}

type MessageRow = {
  id: string
  room_id: string
  sender_id: string | null
  sender_name: string
  content: string
  type: ChatMessage['type']
  created_at: string
}

const EMOJIS = ['😊', '👍', '🎉', '❤️', '😂', '🤔', '👋', '🔥', '💯', '📚', '✅', '⭐']

const roomTypeIcon: Record<string, React.ElementType> = {
  course: Hash,
  major: Users,
  general: MessageSquare,
  direct: MessageSquare,
}

const ROOM_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const DEFAULT_ROOMS: Array<Pick<RoomRow, 'name' | 'type' | 'description' | 'course_code' | 'university_name' | 'color'>> = [
  {
    name: 'General Student Lounge',
    type: 'general',
    description: 'Open room for student discussions',
    course_code: null,
    university_name: 'Community',
    color: '#f59e0b',
  },
  {
    name: 'COMP 2007 Study Group',
    type: 'course',
    description: 'Data Structures & Algorithms study group',
    course_code: 'COMP 2007',
    university_name: 'Community',
    color: '#8b5cf6',
  },
  {
    name: 'CS Major Chat',
    type: 'major',
    description: 'Computer Science students hangout',
    course_code: null,
    university_name: 'Community',
    color: '#6366f1',
  },
]

function mapRoom(row: RoomRow, memberCount: number): ChatRoom {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? undefined,
    courseCode: row.course_code ?? undefined,
    university: row.university_name ?? undefined,
    memberCount,
    unreadCount: 0,
    color: row.color ?? '#6366f1',
    createdAt: new Date(row.created_at),
  }
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id ?? 'unknown',
    senderName: row.sender_name,
    content: row.content,
    type: row.type,
    createdAt: new Date(row.created_at),
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Something went wrong while connecting to chat.'
}

export default function CommunityPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [chatMode, setChatMode] = useState<'realtime' | 'demo'>('demo')
  const [chatError, setChatError] = useState<string | null>(null)
  const { user, profile } = useAuth()
  const authUserId = user?.id ?? null
  const currentUser = {
    id: user?.id ?? '',
    name: profile?.name?.trim()
      || user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || (user ? `Student-${user.id.slice(0, 6)}` : 'Student'),
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeRoomRef = useRef<string | null>(null)

  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'general' as ChatRoom['type'],
    description: '',
    color: '#6366f1',
  })

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null
  const roomMessages = useMemo(() => activeRoomId
    ? allMessages
      .filter((message) => message.roomId === activeRoomId)
      .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
    : [], [activeRoomId, allMessages])

  const filteredRooms = rooms.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    activeRoomRef.current = activeRoomId
  }, [activeRoomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages, activeRoomId])

  const setDemoMode = useCallback((reason?: string) => {
    setChatMode('demo')
    setChatError(reason ?? null)
    setRooms(mockChatRooms)
    setActiveRoomId((prev) => prev ?? mockChatRooms[0]?.id ?? null)
    setAllMessages(mockChatMessages)
    setLoadingRooms(false)
  }, [])

  const ensureMembership = useCallback(async (roomId: string, userId: string) => {
    if (!supabase) return

    const { error } = await supabase
      .from('room_members')
      .upsert({ room_id: roomId, student_id: userId }, { onConflict: 'room_id,student_id' })

    if (error) {
      throw error
    }
  }, [])

  const fetchMessages = useCallback(async (roomId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, room_id, sender_id, sender_name, content, type, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const mapped = (data ?? []).map((row) => mapMessage(row as MessageRow))
    setAllMessages((prev) => [
      ...prev.filter((message) => message.roomId !== roomId),
      ...mapped,
    ])
  }, [])

  const refreshRooms = useCallback(async (userId: string, preserveActive = true) => {
    if (!supabase) return

    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, name, type, description, course_code, university_name, color, created_at')
      .order('created_at', { ascending: true })

    if (roomError) {
      throw roomError
    }

    const roomRows = (roomData ?? []) as RoomRow[]
    if (roomRows.length === 0) {
      setRooms([])
      setActiveRoomId(null)
      setAllMessages([])
      return
    }

    const roomIds = roomRows.map((room) => room.id)

    const { data: memberData, error: memberError } = await supabase
      .from('room_members')
      .select('room_id, student_id')
      .in('room_id', roomIds)

    if (memberError) {
      throw memberError
    }

    const counts = (memberData ?? []).reduce<Record<string, number>>((acc, item) => {
      const row = item as MemberRow
      acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
      return acc
    }, {})

    const mappedRooms = roomRows.map((room) => mapRoom(room, counts[room.id] ?? 0))
    setRooms(mappedRooms)

    const hasPrevious =
      preserveActive &&
      activeRoomRef.current &&
      mappedRooms.some((room) => room.id === activeRoomRef.current)

    const nextActiveRoomId = hasPrevious ? activeRoomRef.current : mappedRooms[0].id
    setActiveRoomId(nextActiveRoomId)

    if (nextActiveRoomId) {
      await ensureMembership(nextActiveRoomId, userId)
      await fetchMessages(nextActiveRoomId)
    }
  }, [ensureMembership, fetchMessages])

  useEffect(() => {
    if (!authUserId) return
    let cancelled = false

    async function initRealtimeChat() {
      setLoadingRooms(true)

      try {
        const { count, error: countError } = await supabase
          .from('chat_rooms')
          .select('*', { head: true, count: 'exact' })

        if (countError) throw countError

        if ((count ?? 0) === 0) {
          const { error: seedError } = await supabase.from('chat_rooms').insert(DEFAULT_ROOMS)
          if (seedError) throw seedError
        }

        await refreshRooms(authUserId!)

        if (!cancelled) {
          setChatMode('realtime')
          setChatError(null)
          setLoadingRooms(false)
        }
      } catch (error) {
        if (!cancelled) {
          setDemoMode(`${getErrorMessage(error)} Using local demo chat.`)
        }
      }
    }

    initRealtimeChat()

    return () => {
      cancelled = true
    }
  }, [authUserId, refreshRooms, setDemoMode])

  useEffect(() => {
    if (!supabase || chatMode !== 'realtime' || !authUserId) return
    const client = supabase

    const channel = client
      .channel(`community-rooms-${authUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        () => {
          void refreshRooms(authUserId, true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members' },
        () => {
          void refreshRooms(authUserId, true)
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [authUserId, chatMode, refreshRooms])

  useEffect(() => {
    if (!supabase || chatMode !== 'realtime' || !activeRoomId) return
    const client = supabase

    const channel = client
      .channel(`community-room-${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoomId}`,
        },
        (payload) => {
          const incoming = mapMessage(payload.new as MessageRow)
          setAllMessages((prev) => {
            if (prev.some((message) => message.id === incoming.id)) {
              return prev
            }
            return [...prev, incoming]
          })
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [activeRoomId, chatMode])

  useEffect(() => {
    if (!supabase || chatMode !== 'realtime' || !activeRoomId || !authUserId) return

    const roomId = activeRoomId
    const userId = authUserId
    let cancelled = false

    async function joinAndLoadRoom() {
      try {
        await ensureMembership(roomId, userId)
        await fetchMessages(roomId)
      } catch (error) {
        if (!cancelled) {
          setChatError(getErrorMessage(error))
        }
      }
    }

    joinAndLoadRoom()

    return () => {
      cancelled = true
    }
  }, [activeRoomId, authUserId, chatMode, ensureMembership, fetchMessages])

  async function sendMessage(text?: string, messageType: ChatMessage['type'] = 'text') {
    const content = (text ?? input).trim()
    if (!content || !activeRoom) return

    if (chatMode === 'demo' || !supabase || !authUserId) {
      const newMessage: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        roomId: activeRoom.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content,
        type: messageType,
        createdAt: new Date(),
      }
      setAllMessages((prev) => [...prev, newMessage])
      setInput('')
      setShowEmoji(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: authUserId,
          sender_name: currentUser.name,
          content,
          type: messageType,
        })
        .select('id, room_id, sender_id, sender_name, content, type, created_at')
        .single()

      if (error) throw error

      if (data) {
        const mapped = mapMessage(data as MessageRow)
        setAllMessages((prev) => {
          if (prev.some((message) => message.id === mapped.id)) {
            return prev
          }
          return [...prev, mapped]
        })
      }

      setInput('')
      setShowEmoji(false)
      setChatError(null)
    } catch (error) {
      setChatError(getErrorMessage(error))
    }
  }

  async function createRoom() {
    if (!newRoom.name.trim()) return

    if (chatMode === 'demo' || !supabase || !authUserId) {
      const room: ChatRoom = {
        id: `room-${Date.now()}`,
        name: newRoom.name.trim(),
        type: newRoom.type,
        description: newRoom.description.trim() || undefined,
        memberCount: 1,
        color: newRoom.color,
        unreadCount: 0,
        createdAt: new Date(),
      }
      setRooms((prev) => [...prev, room])
      setActiveRoomId(room.id)
      setNewRoom({ name: '', type: 'general', description: '', color: '#6366f1' })
      setShowCreateRoom(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: newRoom.name.trim(),
          type: newRoom.type,
          description: newRoom.description.trim() || null,
          color: newRoom.color,
          university_name: 'Community',
        })
        .select('id, name, type, description, course_code, university_name, color, created_at')
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create room.')
      }

      await ensureMembership(data.id, authUserId)
      await refreshRooms(authUserId, true)
      setActiveRoomId(data.id)

      setNewRoom({ name: '', type: 'general', description: '', color: '#6366f1' })
      setShowCreateRoom(false)
      setChatError(null)
    } catch (error) {
      setChatError(getErrorMessage(error))
    }
  }

  async function handleLeaveRoom() {
    if (!activeRoomId) return

    if (chatMode === 'demo' || !supabase || !authUserId) {
      const remaining = rooms.filter((room) => room.id !== activeRoomId)
      setRooms(remaining)
      setAllMessages((prev) => prev.filter((message) => message.roomId !== activeRoomId))
      setActiveRoomId(remaining[0]?.id ?? null)
      setShowRoomInfo(false)
      return
    }

    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', activeRoomId)
        .eq('student_id', authUserId)

      if (error) throw error

      await refreshRooms(authUserId, false)
      setShowRoomInfo(false)
      setChatError(null)
    } catch (error) {
      setChatError(getErrorMessage(error))
    }
  }

  function handleFileAttach(file: File) {
    void sendMessage(`📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'file')
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
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
            <Input
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border-slate-100 bg-slate-50 pl-8 text-xs"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Badge variant={chatMode === 'realtime' ? 'success' : 'secondary'} className="text-[10px]">
              {chatMode === 'realtime' ? 'Live' : 'Demo'}
            </Badge>
            {loadingRooms && <span className="text-[10px] text-slate-400">Connecting...</span>}
          </div>

          {chatError && (
            <p className="mt-2 text-[11px] text-amber-600">
              {chatError}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rooms</p>
          {filteredRooms.map((room) => {
            const Icon = roomTypeIcon[room.type] ?? MessageSquare
            const isActive = activeRoom?.id === room.id

            return (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: (room.color ?? '#6366f1') + '20' }}>
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
            <p className="px-3 py-4 text-center text-xs text-slate-400">No rooms found</p>
          )}
        </ScrollArea>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-500 text-[10px] text-white">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">{currentUser.name}</p>
              <div className="flex items-center gap-1">
                <div className={cn('h-1.5 w-1.5 rounded-full', chatMode === 'realtime' ? 'bg-emerald-400' : 'bg-amber-400')} />
                <span className="text-[10px] text-slate-400">{chatMode === 'realtime' ? 'Online' : 'Demo mode'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-slate-50">
        {activeRoom ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: (activeRoom.color ?? '#6366f1') + '20' }}>
                  {(() => {
                    const Icon = roomTypeIcon[activeRoom.type] ?? MessageSquare
                    return <Icon className="h-5 w-5" style={{ color: activeRoom.color }} />
                  })()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{activeRoom.name}</p>
                  <p className="text-xs text-slate-400">{activeRoom.memberCount} members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{activeRoom.courseCode ?? activeRoom.type}</Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowRoomInfo(true)} title="Room info">
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-4 md:px-6">
              {roomMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">No messages yet</p>
                  <p className="text-xs text-slate-400">Be the first to say something!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roomMessages.map((msg, i) => {
                    const isMe = msg.senderId === currentUser.id
                    const showAvatar = !isMe && (i === 0 || roomMessages[i - 1]?.senderId !== msg.senderId)

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className={cn('flex items-end gap-3', isMe && 'flex-row-reverse')}
                      >
                        <div className={cn('h-8 w-8 shrink-0', !showAvatar && !isMe && 'invisible')}>
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-[10px] text-white">
                                {getInitials(msg.senderName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className={cn('flex max-w-[65%] flex-col gap-1', isMe && 'items-end')}>
                          {showAvatar && !isMe && <p className="px-1 text-[11px] font-semibold text-slate-500">{msg.senderName}</p>}
                          <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed', isMe ? 'rounded-br-sm bg-gradient-to-br from-emerald-600 to-green-600 text-white' : 'rounded-bl-sm border border-slate-100 bg-white text-slate-800 shadow-sm')}>
                            {msg.content}
                          </div>
                          <p className={cn('px-1 text-[10px] text-slate-400', isMe && 'text-right')}>
                            {format(new Date(msg.createdAt), 'h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </ScrollArea>

            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mx-4 mb-2 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-md"
                >
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => setInput((prev) => prev + emoji)} className="text-xl transition-transform hover:scale-125">
                      {emoji}
                    </button>
                  ))}
                  <button onClick={() => setShowEmoji(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-slate-100 bg-white p-4">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileAttach(file)
                }}
              />

              <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all focus-within:border-emerald-300 focus-within:bg-white">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={`Message ${activeRoom.name}...`}
                  className="min-h-[40px] max-h-24 flex-1 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  rows={1}
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-500" onClick={() => setShowEmoji((prev) => !prev)} title="Emoji">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-500" onClick={() => fileRef.current?.click()} title="Attach file">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="icon" className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white" onClick={() => void sendMessage()} disabled={!input.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No rooms available</p>
              <p className="text-xs text-slate-400">Create a new room to start chatting.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Room</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Room Name *</Label>
              <Input placeholder="e.g. COMP 2007 Study Group" value={newRoom.name} onChange={(e) => setNewRoom((prev) => ({ ...prev, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Type</Label>
              <Select value={newRoom.type} onValueChange={(value) => setNewRoom((prev) => ({ ...prev, type: value as ChatRoom['type'] }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Description</Label>
              <Input placeholder="What's this room about?" value={newRoom.description} onChange={(e) => setNewRoom((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Color</Label>
              <div className="flex gap-2">
                {ROOM_COLORS.map((color) => (
                  <button key={color} onClick={() => setNewRoom((prev) => ({ ...prev, color }))} className={cn('h-7 w-7 rounded-full transition-all', newRoom.color === color ? 'scale-110 ring-2 ring-emerald-500 ring-offset-2' : 'hover:scale-105')} style={{ backgroundColor: color }} />
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

      <Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{activeRoom?.name}</DialogTitle></DialogHeader>
          {activeRoom && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: (activeRoom.color ?? '#6366f1') + '20' }}>
                  {(() => {
                    const Icon = roomTypeIcon[activeRoom.type] ?? MessageSquare
                    return <Icon className="h-5 w-5" style={{ color: activeRoom.color }} />
                  })()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeRoom.name}</p>
                  <p className="text-xs text-slate-400">{activeRoom.memberCount} members · {activeRoom.type}</p>
                </div>
              </div>

              {activeRoom.description && <p className="text-sm text-slate-600">{activeRoom.description}</p>}

              <Button variant="outline" size="sm" className="w-full border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => void handleLeaveRoom()}>
                Leave Room
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
