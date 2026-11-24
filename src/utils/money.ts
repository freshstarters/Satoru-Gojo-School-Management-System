import { sampleWorkspace } from '../fixtures/sampleWorkspace.ts'

const amountFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatLrd(amount: number) {
  return `LRD ${amountFormat.format(amount)}`
}

export function formatUsdEquivalent(amountLrd: number) {
  const usd = amountLrd / sampleWorkspace.usdPerLrd
  return `≈ USD ${amountFormat.format(usd)}`
}
