import { useSyncExternalStore } from 'react'

export type ToastTone = 'info' | 'success' | 'warn' | 'danger'

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

let nextId = 1
let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function pushToast(message: string, tone: ToastTone = 'info') {
  const id = nextId
  nextId += 1
  items = [...items, { id, message, tone }]
  emit()
  window.setTimeout(() => dismissToast(id), 4200)
}

export function dismissToast(id: number) {
  if (!items.some((item) => item.id === id)) return
  items = items.filter((item) => item.id !== id)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return items
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
