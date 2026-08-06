import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5)
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // MED-1: Use useMemo to create a stable toast API object
  // instead of mutating the useCallback return value
  const toast = useMemo(() => {
    const fn = (message, type) => addToast(message, type)
    fn.success = (msg) => addToast(msg, 'success')
    fn.error = (msg) => addToast(msg, 'error')
    fn.info = (msg) => addToast(msg, 'info')
    return fn
  }, [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="assertive">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type} pointer-events-auto flex items-center justify-between gap-3 cursor-pointer`}
            onClick={() => removeToast(t.id)}
            role="alert"
          >
            <span>{t.message}</span>
            <button className="opacity-60 hover:opacity-100 text-xs ml-2" aria-label="Dismiss">&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
