const amountFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatLrd(amount: number) {
  return `LRD ${amountFormat.format(amount)}`
}

export function formatUsdEquivalent(amountLrd: number, lrdPerUsd: number) {
  const usd = amountLrd / lrdPerUsd
  return `≈ USD ${amountFormat.format(usd)}`
}
