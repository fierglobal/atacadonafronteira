import { Suspense } from 'react'
import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import HomeClient from './HomeClient'

export const revalidate = 60

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <HomeClient />
      </Suspense>
    </>
  )
}
