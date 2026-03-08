import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) { return twMerge(clsx(inputs)) }

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(date, opts = {}) {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', ...opts }).format(new Date(date))
  } catch { return '—' }
}

export function formatRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function generateAvatarColor(name = '') {
  const colors = ['#0ea5e9', '#8b5cf6', '#00f5d4', '#f43f5e', '#fb923c', '#22c55e', '#eab308']
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[idx]
}

export function truncate(str, max = 100) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

/**
 * Normalise a provider object — works for both DB records and mock data.
 * DB records have: skillsOffered, rating: {average, count}, location: {city, state}
 * Mock records have: skills, rating (number), reviewCount, location (string)
 */
export function normalizeProvider(p) {
  if (!p) return null
  const ratingAvg = typeof p.rating === 'object' ? (p.rating?.average ?? 0) : (p.rating ?? 0)
  const ratingCount = typeof p.rating === 'object' ? (p.rating?.count ?? 0) : (p.reviewCount ?? 0)

  const skills = p.skills || p.skillsOffered || []

  const locationStr = typeof p.location === 'string'
    ? p.location
    : p.locationStr
    || [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ')
    || ''

  const hourlyRate = p.hourlyRate
    || p.pricing?.amount
    || p.services?.[0]?.pricing?.amount
    || 0

  return {
    ...p,
    skills,
    skillsOffered: skills,
    rating: ratingAvg,
    reviewCount: ratingCount,
    hourlyRate,
    location: locationStr,
    // Keep original for detail pages that need nested structure
    _rawLocation: p.location,
    _rawRating: p.rating,
  }
}

export const CATEGORIES = [
  { id: 'coding', label: 'Coding', icon: '💻', color: '#0ea5e9' },
  { id: 'design', label: 'Design', icon: '🎨', color: '#8b5cf6' },
  { id: 'tutoring', label: 'Tutoring', icon: '📚', color: '#22c55e' },
  { id: 'fitness', label: 'Fitness', icon: '🏋️', color: '#f43f5e' },
  { id: 'music', label: 'Music', icon: '🎵', color: '#eab308' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', color: '#fb923c' },
  { id: 'cooking', label: 'Cooking', icon: '🍳', color: '#00f5d4' },
  { id: 'photography', label: 'Photography', icon: '📷', color: '#ec4899' },
  { id: 'language', label: 'Language', icon: '🌍', color: '#06b6d4' },
  { id: 'business', label: 'Business', icon: '💼', color: '#84cc16' },
]

export const MOCK_PROVIDERS = []
export const MOCK_REVIEWS = []
export const MOCK_BOOKINGS_CUSTOMER = []
