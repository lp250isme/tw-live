import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPercentage(value) {
  if (value == null) return '--'
  return Number(value).toFixed(1)
}

export function formatNumber(value) {
  if (value == null) return '--'
  return Number(value).toLocaleString('zh-TW')
}

// #rrggbb (or #rgb) -> rgba(...) with the given alpha. Used to derive tier
// glow/border/badge colours from a single source accent/tier colour.
export function withAlpha(hex, a) {
  if (typeof hex !== 'string') return `rgba(148,163,184,${a})`
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
