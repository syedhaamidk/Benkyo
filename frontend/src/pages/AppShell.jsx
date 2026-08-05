import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import LineSidebar from '../components/ui/LineSidebar'
import WaveText from '../components/text-animations/WaveText'
import ShinyText from '../components/text-animations/ShinyText'
import DecryptText from '../components/text-animations/DecryptText'

const NAV_ITEMS = ['Chat', 'Quiz', 'Flashcards', 'Notes', 'Progress']
const NAV_PATHS = ['/app/chat', '/app/quiz', '/app/flashcards', '/app/notes', '/app/progress']

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()

  // Ensure session_id exists in sessionStorage
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('benkyo_session_id')
    if (!id) {
      id = 'session_' + Math.random().toString(36).substring(2, 11)
      sessionStorage.setItem('benkyo_session_id', id)
    }
    return id
  })

  // Compute active index based on route
  const activeIndex = NAV_PATHS.findIndex((path) => location.pathname.startsWith(path))
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0

  const handleItemClick = (index) => {
    if (NAV_PATHS[index]) {
      navigate(NAV_PATHS[index])
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text">
      {/* ── Left Sidebar Panel ─────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 border-r border-border/40 bg-bg-base/90 flex flex-col justify-between p-6">
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
                <WaveText text="Benkyo" className="text-xl font-extrabold text-white" />
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
          <p className="mb-1">Session ID:</p>
          <p className="font-mono text-[10px] text-accent/80 truncate mb-3" title={sessionId}>
            {sessionId}
          </p>
          <DecryptText
            text="Powered by Groq + RAG"
            trigger="mount"
            speed={40}
            className="text-[11px] text-text-muted block"
          />
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-secondary overflow-y-auto">
        <Outlet context={{ sessionId }} />
      </main>
    </div>
  )
}
