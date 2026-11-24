import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return <span data-tooltip={text}>{children}</span>
}

export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)

  useEffect(() => {
    function show(event: Event) {
      const target = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null
      if (!(target instanceof HTMLElement)) {
        setTip(null)
        return
      }
      const text = target.getAttribute('data-tooltip') ?? ''
      if (!text) {
        setTip(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setTip({ text, x: rect.left + rect.width / 2, y: rect.top - 8 })
    }

    function hide(event: Event) {
      const target = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null
      if (target) setTip(null)
    }

    document.addEventListener('mouseover', show)
    document.addEventListener('focusin', show)
    document.addEventListener('mouseout', hide)
    document.addEventListener('focusout', hide)
    return () => {
      document.removeEventListener('mouseover', show)
      document.removeEventListener('focusin', show)
      document.removeEventListener('mouseout', hide)
      document.removeEventListener('focusout', hide)
    }
  }, [])

  if (!tip) return null
  return createPortal(
    <div className="crm-tooltip is-on" style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -100%)' }}>
      {tip.text}
    </div>,
    document.body,
  )
}
