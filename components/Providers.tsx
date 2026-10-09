'use client'
import { CarrinhoProvider } from './CarrinhoContext'
import { CarrinhoSidebar } from './CarrinhoSidebar'
import { MinimoBar } from './MinimoBar'
import BottomTabBar from './BottomTabBar'
import { ListaRecompraProvider } from './ListaRecompraContext'
import { ReactNode } from 'react'

export function Providers({ brlRate, children }: { brlRate?: number; children: ReactNode }) {
  return (
    <CarrinhoProvider brlRate={brlRate}>
      <ListaRecompraProvider>
        {children}
        <CarrinhoSidebar />
        <MinimoBar />
        <BottomTabBar />
      </ListaRecompraProvider>
    </CarrinhoProvider>
  )
}
