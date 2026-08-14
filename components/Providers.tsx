'use client'
import { CarrinhoProvider } from './CarrinhoContext'
import { CarrinhoSidebar } from './CarrinhoSidebar'
import { MinimoBar } from './MinimoBar'
import { ReactNode } from 'react'

export function Providers({ brlRate, children }: { brlRate?: number; children: ReactNode }) {
  return (
    <CarrinhoProvider brlRate={brlRate}>
      {children}
      <CarrinhoSidebar />
      <MinimoBar />
    </CarrinhoProvider>
  )
}
