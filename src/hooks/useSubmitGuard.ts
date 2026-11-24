import { useRef } from 'react'

export function useSubmitGuard() {
  const busy = useRef(false)
  const key = useRef('')
  const fingerprint = useRef('')

  function claim(fields: string) {
    if (busy.current) return ''
    busy.current = true
    if (fingerprint.current !== fields) {
      fingerprint.current = fields
      key.current = crypto.randomUUID()
    }
    return key.current
  }

  function release() {
    busy.current = false
  }

  return { claim, release }
}
