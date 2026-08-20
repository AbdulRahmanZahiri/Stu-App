'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { AppProvider } from '@/lib/app-store'
import { useAppStore } from '@/lib/app-store'
import { PlannerProvider } from '@/lib/planner-store'
import { AlertCircle, Database, X } from 'lucide-react'

function DataStatus() {
  const { dataMode, loading, syncError, clearSyncError } = useAppStore()
  if (!syncError && !loading) return null

  return (
    <div className={syncError
      ? 'flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700'
      : 'flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700'
    }>
      {syncError ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <Database className="h-3.5 w-3.5 shrink-0 animate-pulse" />}
      <span className="flex-1">
        {syncError ?? (dataMode === 'database' ? 'Loading your ScholarFlow data…' : 'Loading demo data…')}
      </span>
      {syncError && (
        <button type="button" onClick={clearSyncError} aria-label="Dismiss synchronization error">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <AppProvider>
      <PlannerProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Mobile backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onMobileMenuClick={() => setMobileOpen((v) => !v)} />
          <DataStatus />
          <motion.main
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 overflow-y-auto"
          >
            {children}
          </motion.main>
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
      </PlannerProvider>
    </AppProvider>
  )
}
