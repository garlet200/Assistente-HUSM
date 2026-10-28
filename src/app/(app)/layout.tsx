/**
 * @file layout.tsx
 * @description Layout da área autenticada (Route Group `(app)`), compondo o shell mobile-first
 * com TopBar fixa no topo, área principal rolável e BottomNav na base.
 */

import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <TopBar />
      
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
