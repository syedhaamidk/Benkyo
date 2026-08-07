import { MessageSquare, Puzzle, Layers, FileText, BarChart3 } from 'lucide-react'

const DOCK_ITEMS = [
  { label: 'Chat', path: '/app/chat', icon: MessageSquare },
  { label: 'Quiz', path: '/app/quiz', icon: Puzzle },
  { label: 'Flashcards', path: '/app/flashcards', icon: Layers },
  { label: 'Notes', path: '/app/notes', icon: FileText },
  { label: 'Progress', path: '/app/progress', icon: BarChart3 },
]

/**
 * Persistent bottom tab bar for small screens, replacing the need to open
 * the full hamburger sidebar just to switch tabs. Hidden at md+ where the
 * regular sidebar nav is already visible.
 */
export default function MobileDock({ activePath, onNavigate }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 60%, transparent)' }}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-around bg-bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl px-1 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {DOCK_ITEMS.map(({ label, path, icon: Icon }) => {
          const isActive = activePath.startsWith(path)
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
                isActive ? 'text-accent bg-accent/15' : 'text-text-muted'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
