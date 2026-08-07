import { useRef } from 'react'
import { Upload, Sparkles, ListChecks } from 'lucide-react'

const CARDS = [
  {
    id: 'a',
    icon: Upload,
    title: 'Upload notes',
    sub: 'PDF, slides, docs',
    hint: '→ start here',
    float: 'float-a',
    position: 'top-[12%] left-[4%] md:left-[8%]',
    tint: 'rgba(168,85,247,0.4)',
    bg: 'linear-gradient(160deg, rgba(168,85,247,0.22), rgba(20,17,28,0.82))',
  },
  {
    id: 'b',
    icon: Sparkles,
    title: 'AI processes',
    sub: 'RAG + citations',
    hint: '→ see sources',
    float: 'float-b',
    position: 'bottom-[10%] left-[8%] md:left-[12%]',
    tint: 'rgba(99,102,241,0.4)',
    bg: 'linear-gradient(160deg, rgba(99,102,241,0.22), rgba(20,17,28,0.82))',
  },
  {
    id: 'c',
    icon: ListChecks,
    title: 'Quiz & recall',
    sub: 'Flashcards, weak topics',
    hint: '→ test yourself',
    float: 'float-c',
    position: 'top-[16%] right-[4%] md:right-[9%]',
    tint: 'rgba(236,72,153,0.4)',
    bg: 'linear-gradient(160deg, rgba(236,72,153,0.22), rgba(20,17,28,0.82))',
  },
]

function FloatCard({ card }) {
  const ref = useRef(null)
  const Icon = card.icon

  const handleMouseMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(500px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.06) translateY(-6px)`
  }

  const handleMouseEnter = () => {
    ref.current?.classList.add('paused')
  }

  const handleMouseLeave = () => {
    ref.current?.classList.remove('paused')
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`float-card ${card.float} group absolute ${card.position} w-32 h-40 rounded-2xl backdrop-blur-md
        flex flex-col items-center justify-center gap-1.5 text-center p-4 cursor-pointer
        border shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}
      style={{ background: card.bg, borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
        style={{ background: `${card.tint}`, border: `1px solid ${card.tint}` }}
      >
        <Icon size={15} className="text-white" />
      </div>
      <span className="text-[11px] font-bold text-white">{card.title}</span>
      <span className="text-[9.5px] text-text-muted leading-tight">{card.sub}</span>
      <span className="text-[9px] font-bold text-accent opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 mt-0.5">
        {card.hint}
      </span>
    </div>
  )
}

/**
 * Three translucent cards drifting around the hero panel, illustrating the
 * actual product pipeline (upload → AI → quiz) rather than pure decoration.
 * Hidden on small screens where there's no room for them to breathe.
 */
export default function HeroFloatingCards() {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none hidden lg:block">
      <div className="relative w-full h-full pointer-events-auto">
        {CARDS.map((card) => (
          <FloatCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
