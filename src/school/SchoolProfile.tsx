import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { fetchSettings } from '../service/settings.ts'
import { SchoolProfileContext } from './school-profile.ts'

const READERS = new Set(['principal', 'registrar', 'bursar'])

export function SchoolProfileProvider({ children }: { children: ReactNode }) {
  const { user, config } = useAuth()
  const [schoolName, setSchoolName] = useState(config?.school_name?.trim() ?? '')
  const [lrdPerUsd, setRate] = useState<number | null>(null)
  const role = user?.role ?? ''

  useEffect(() => {
    const fromConfig = config?.school_name?.trim()
    if (fromConfig) setSchoolName(fromConfig)
  }, [config?.school_name])

  useEffect(() => {
    if (!READERS.has(role)) return
    let cancelled = false
    void fetchSettings()
      .then((settings) => {
        if (cancelled) return
        const rate = Number(settings.lrd_per_usd)
        setSchoolName(settings.school_name)
        setRate(Number.isFinite(rate) && rate > 0 ? rate : null)
      })
      .catch(() => {
        if (cancelled) return
        setRate(null)
      })
    return () => {
      cancelled = true
    }
  }, [role])

  const value = useMemo(
    () => ({ schoolName, lrdPerUsd, setSchoolName, setRate }),
    [schoolName, lrdPerUsd],
  )
  return <SchoolProfileContext.Provider value={value}>{children}</SchoolProfileContext.Provider>
}
