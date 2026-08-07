import { useEffect, useState } from 'react'

const COLORS = ['#A855F7', '#EC4899', '#6366F1', '#ffffff', '#F59E0B']

/**
 * A one-shot confetti burst. Mount this component to trigger it — it's
 * meant to be conditionally rendered only when the moment actually earns it
 * (e.g. a perfect quiz score), not as ambient decoration.
 */
export default function ConfettiBurst({ pieceCount = 40 }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const generated = Array.from({ length: pieceCount }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const distance = 80 + Math.random() * 160
      return {
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance - 40, // bias upward
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        size: 5 + Math.random() * 5,
      }
    })
    setPieces(generated)
    const timer = setTimeout(() => setPieces([]), 1600)
    return () => clearTimeout(timer)
  }, [pieceCount])

  if (pieces.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animation: `confettiBurst 1.3s cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}s forwards`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--rot': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
