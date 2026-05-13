import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function calculateProration(
  dateStr: string,
  monthlyRent: number,
  isFirst: boolean
): number {
  const d = new Date(dateStr)
  const day = d.getUTCDate()
  const daysInMonth = getDaysInMonth(d.getUTCFullYear(), d.getUTCMonth())
  const dailyRate = monthlyRent / daysInMonth
  if (isFirst) {
    if (day === 1) return monthlyRent
    return Math.round((daysInMonth - day + 1) * dailyRate * 100) / 100
  } else {
    if (day === daysInMonth) return monthlyRent
    return Math.round(day * dailyRate * 100) / 100
  }
}
