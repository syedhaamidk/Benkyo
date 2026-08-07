import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 up to `value` on mount (or whenever `value` changes).
 * Respects prefers-reduced-motion — jumps straight to the final value if set.
 */
export default function CountUp({
  value,
  duration = 1200,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplay(value)
      return
    }

    const start = performance.now()
    const from = 0

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (value - from) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}
