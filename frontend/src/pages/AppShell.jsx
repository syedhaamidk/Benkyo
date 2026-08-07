import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import LineSidebar from '../components/ui/LineSidebar'
import MobileDock from '../components/ui/MobileDock'
import WaveText from '../components/text-animations/WaveText'
import ShinyText from '../components/text-animations/ShinyText'
import DecryptText from '../components/text-animations/DecryptText'
import { Menu, X, Eye, EyeOff, ServerCrash, RotateCw } from 'lucide-react'

const NAV_ITEMS = ['Chat', 'Quiz', 'Flashcards', 'Notes', 'Progress']
const NAV_PATHS = ['/app/chat', '/app/quiz', '/app/flashcards', '/app/notes', '/app/progress']

// MIN-5: Per-route document titles
const ROUTE_TITLES = {
  '/app/chat': 'Chat — Benkyo',
  '/app/quiz': 'Quiz — Benkyo',
  '/app/flashcards': 'Flashcards — Benkyo',
  '/app/notes': 'Notes — Benkyo',
  '/app/progress': 'Progress — Benkyo',
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()

  // UX-1: Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // SEC-6: Session ID acts as a bearer token for this session's data — don't
  // leave it visible on-screen by default (visible in screenshots, over-the-
  // shoulder, screen shares). Click to reveal it when actually needed.
  const [sessionIdRevealed, setSessionIdRevealed] = useState(false)

  // MED-3: Use localStorage instead of sessionStorage so data persists across tabs
  // SEC-6: crypto.randomUUID() instead of Math.random() — the session ID is the
  // only thing gating access to a user's documents/chats/results (no login), so
  // it needs real cryptographic entropy, not a guessable/brute-forceable string.
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('benkyo_session_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('benkyo_session_id', id)
    }
    return id
  })

  // Compute active index based on route
  const activeIndex = NAV_PATHS.findIndex((path) => location.pathname.startsWith(path))
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0

  // UX-4: Distinguish "backend is genuinely unreachable" from per-action
  // errors (which already get their own inline messages/toasts on each
  // page). This is specifically for the case where nothing will work —
  // wrong backend URL, server not running, network down — so the person
  // gets a clear explanation instead of five separate pages silently failing.
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking' | 'ok' | 'down'

  const checkBackend = useCallback(async () => {
    setBackendStatus('checking')
    const base = import.meta.env.VITE_API_URL ?? '/api'
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${base}/health`, { signal: controller.signal })
      clearTimeout(timeout)
      setBackendStatus(res.ok ? 'ok' : 'down')
    } catch {
      setBackendStatus('down')
    }
  }, [])

  useEffect(() => {
    checkBackend()
  }, [checkBackend])


  // MIN-5: Update document title on route change
  useEffect(() => {
    const matchedPath = NAV_PATHS.find((path) => location.pathname.startsWith(path))
    document.title = ROUTE_TITLES[matchedPath] || 'Benkyo — AI Study Assistant'
  }, [location.pathname])

  const handleItemClick = (index) => {
    if (NAV_PATHS[index]) {
      navigate(NAV_PATHS[index])
      setSidebarOpen(false) // close mobile sidebar on nav
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text">
      {/* UX-1: Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-bg-card border border-border/50 rounded-lg p-2 text-white"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* UX-1: Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar Panel ─────────────────────────────────── */}
      <aside
        className={`
          w-64 flex-shrink-0 border-r border-border/40 bg-bg-base/90 flex flex-col justify-between p-6
          fixed md:relative z-40 h-full
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* Brand Header */}
          <div
            className="flex items-center gap-2 mb-8 cursor-pointer"
            role="link"
            tabIndex={0}
            aria-label="Benkyo home"
            onClick={() => navigate('/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate('/')
              }
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-lg">
              勉強
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <WaveText text="Benkyo" className="font-display text-xl font-extrabold text-white" />
                <ShinyText text="Beta" className="text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/30 rounded px-1" />
              </div>
              <span className="text-[11px] text-text-muted">AI Study Assistant</span>
            </div>
          </div>

          {/* Nav List */}
          <div className="mt-4">
            <LineSidebar
              items={NAV_ITEMS}
              defaultActive={safeActiveIndex}
              onItemClick={handleItemClick}
              accentColor="#A855F7"
              textColor="#c4c4c4"
              markerColor="#6b7280"
              fontSize={1.0}
              itemGap={14}
            />
          </div>
        </div>

        {/* Footer info badge */}
        <div className="pt-4 border-t border-border/30 text-xs text-text-muted">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] text-accent/80 truncate" title={sessionIdRevealed ? sessionId : undefined}>
              {sessionIdRevealed
                ? sessionId
                : `session_${sessionId.slice(0, 4)}••••••••`}
            </p>
            <button
              type="button"
              onClick={() => setSessionIdRevealed((v) => !v)}
              className="flex-shrink-0 ml-2 text-text-muted hover:text-accent transition-colors"
              aria-label={sessionIdRevealed ? 'Hide session ID' : 'Reveal session ID'}
              title={sessionIdRevealed ? 'Hide session ID' : 'This ID grants access to your data — reveal only if you need it'}
            >
              {sessionIdRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <DecryptText
            text="Powered by Groq + RAG"
            trigger="mount"
            speed={40}
            className="text-[11px] text-text-muted block"
          />
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-secondary overflow-y-auto pb-20 md:pb-0" role="main" aria-live="polite">
        {backendStatus === 'down' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <ServerCrash size={28} />
            </div>
            <h2 className="font-display text-lg font-bold text-white mb-2">Can't reach the Benkyo backend</h2>
            <p className="text-sm text-text-muted max-w-sm mb-5">
              The server isn't responding. It may not be running, or the API URL might be misconfigured.
              Check that the backend is up and try again.
            </p>
            <button
              onClick={checkBackend}
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw size={14} /> Retry
            </button>
          </div>
        ) : (
          /* SEC-6/UX-2: key={pathname} forces a remount on route change, which
             retriggers the animate-up fade/slide so switching tabs feels like
             one app instead of five pages snapping instantly into place. */
          <div key={location.pathname} className="animate-up flex-1 flex flex-col min-w-0">
            <Outlet context={{ sessionId }} />
          </div>
        )}
      </main>

      {/* UX-3: Persistent bottom nav on mobile — replaces needing to open the
          hamburger sidebar just to switch tabs */}
      <MobileDock activePath={location.pathname} onNavigate={(path) => navigate(path)} />
    </div>
  )
}
