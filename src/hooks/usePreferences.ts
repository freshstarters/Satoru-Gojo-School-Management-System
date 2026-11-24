import { useEffect, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark'
export type AccentName = 'blue' | 'slate' | 'emerald' | 'indigo'
export type FontName = 'inter' | 'jakarta' | 'system'

const THEME_KEY = 'gojo.theme'
const ACCENT_KEY = 'gojo.accent'
const FONT_KEY = 'gojo.font'
const USD_KEY = 'gojo.usd'

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function readTheme(): ThemeMode {
  const value = document.documentElement.getAttribute('data-theme')
  return value === 'dark' ? 'dark' : 'light'
}

function readAccent(): AccentName {
  const value = document.documentElement.getAttribute('data-accent')
  if (value === 'slate' || value === 'emerald' || value === 'indigo' || value === 'blue') return value
  return 'blue'
}

function readFont(): FontName {
  const value = document.documentElement.getAttribute('data-font')
  if (value === 'jakarta' || value === 'system' || value === 'inter') return value
  return 'inter'
}

export function applyAppearance(theme: ThemeMode, accent: AccentName, font: FontName) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.setAttribute('data-accent', accent)
  root.setAttribute('data-font', font)
  root.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
  localStorage.setItem(ACCENT_KEY, accent)
  localStorage.setItem(FONT_KEY, font)
  emit()
}

export function setTheme(theme: ThemeMode) {
  applyAppearance(theme, readAccent(), readFont())
}

export function setAccent(accent: AccentName) {
  applyAppearance(readTheme(), accent, readFont())
}

export function setFont(font: FontName) {
  applyAppearance(readTheme(), readAccent(), font)
}

export function showUsdReference() {
  return localStorage.getItem(USD_KEY) !== '0'
}

export function setUsdReference(enabled: boolean) {
  localStorage.setItem(USD_KEY, enabled ? '1' : '0')
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePreferences() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    applyAppearance(readTheme(), readAccent(), readFont())
  }, [])
  return snapshot
}

let cached = ''
let current = {
  theme: 'light' as ThemeMode,
  accent: 'blue' as AccentName,
  font: 'inter' as FontName,
  showUsd: true,
}

function getSnapshot() {
  if (typeof document === 'undefined') return current
  const next = {
    theme: readTheme(),
    accent: readAccent(),
    font: readFont(),
    showUsd: showUsdReference(),
  }
  const key = `${next.theme}|${next.accent}|${next.font}|${next.showUsd}`
  if (key !== cached) {
    cached = key
    current = next
  }
  return current
}
