export function googleSignInEnabled(googleEnabled: boolean) {
  return googleEnabled && import.meta.env.VITE_GOOGLE_CLIENT_ID.trim() !== ''
}
