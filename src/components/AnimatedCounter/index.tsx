'use client'

import React, { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  suffix?: string | null
  label: string
  duration?: number
}

export function AnimatedCounter({ value, suffix, label, duration = 1500 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()

          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * value))
            if (progress < 1) requestAnimationFrame(step)
          }

          requestAnimationFrame(step)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <span className="text-sm md:text-base font-bold text-primary">{label}</span>
      <span className="mt-2 text-4xl md:text-5xl font-bold text-foreground">
        {count}
        {suffix}
      </span>
    </div>
  )
}
