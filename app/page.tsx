import { Suspense } from 'react'
import SiteHeader from '@/components/SiteHeader'
import HomeClient from './HomeClient'

export const revalidate = 60

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
