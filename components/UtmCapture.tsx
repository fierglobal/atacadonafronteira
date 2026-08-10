'use client'
import { useEffect } from 'react'

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

export default function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const captured: Record<string, string> = {}
      for (const k of KEYS) {
        const v = params.get(k)
        if (v) captured[k.replace('utm_', '')] = v
      }
      if (Object.keys(captured).length === 0) return
      const existing = sessionStorage.getItem('utm')
      if (existing) return
      sessionStorage.setItem('utm', JSON.stringify(captured))
    } catch {}
  }, [])
  return null
}
