import { createContext, useContext } from 'react'

export type SchoolProfileValue = {
  schoolName: string
  lrdPerUsd: number | null
  setSchoolName: (name: string) => void
  setRate: (rate: number) => void
}

export const SchoolProfileContext = createContext<SchoolProfileValue | null>(null)

export function useSchoolProfile() {
  const value = useContext(SchoolProfileContext)
  if (!value) {
    return {
      schoolName: '',
      lrdPerUsd: null,
      setSchoolName: () => undefined,
      setRate: () => undefined,
    }
  }
  return value
}
