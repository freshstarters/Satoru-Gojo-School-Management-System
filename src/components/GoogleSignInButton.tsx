import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (idToken: string) => void
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()
  const hostRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [failed, setFailed] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => setWidth(Math.min(400, Math.floor(host.clientWidth)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!clientId || width < 1) return
    let cancelled = false

    function render() {
      if (cancelled || !hostRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current(response.credential),
      })
      hostRef.current.replaceChildren()
      window.google.accounts.id.renderButton(hostRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width,
      })
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')
    if (window.google) {
      render()
      return
    }
    const script = existing ?? document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.googleIdentity = 'true'
    const onLoad = () => render()
    const onError = () => {
      if (!cancelled) setFailed(true)
    }
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    if (!existing) document.body.appendChild(script)
    return () => {
      cancelled = true
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
  }, [clientId, width])

  if (!clientId) return null
  if (failed) return <p className="text-xs text-sub">Google sign-in is not available.</p>
  return <div ref={hostRef} className="w-full max-w-full overflow-hidden" />
}
