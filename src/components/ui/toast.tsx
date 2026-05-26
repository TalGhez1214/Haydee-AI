'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <IconCheck size={16} />,
  error: <IconX size={16} />,
  info: <IconInfoCircle size={16} />,
  warning: <IconAlertTriangle size={16} />,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-brand text-white',
  warning: 'bg-warning text-white',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ref.current = setTimeout(() => onDismiss(toast.id), 4000)
    return () => {
      if (ref.current) clearTimeout(ref.current)
    }
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card px-4 py-3 shadow-panel text-[14px] font-medium',
        'min-w-[260px] max-w-[380px]',
        STYLES[toast.type]
      )}
    >
      <span className="shrink-0">{ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <IconX size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
