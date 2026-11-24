import { useLayoutEffect, useRef, useState } from 'react'

export function Subtabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0, x: 0, y: 0 })

  useLayoutEffect(() => {
    const bar = barRef.current
    const active = bar?.querySelector<HTMLElement>('[data-active="true"]')
    if (!bar || !active) return
    setBox({
      width: active.offsetWidth,
      height: active.offsetHeight,
      x: active.offsetLeft,
      y: active.offsetTop,
    })
  }, [value, tabs])

  return (
    <div ref={barRef} className="subtab-bar" role="tablist">
      <span
        className="tab-glide"
        style={{ width: box.width, height: box.height, transform: `translate(${box.x}px, ${box.y}px)` }}
      />
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-active={selected ? 'true' : 'false'}
            className={`subtab ${selected ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
