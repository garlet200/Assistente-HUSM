/**
 * @file layout.tsx
 * @description Layout da área autenticada (Route Group `(app)`), compondo o shell mobile-first
 * com TopBar fixa no topo, área principal rolável e BottomNav na base.
 */

import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopWorkspaceShell } from '@/components/layout/DesktopWorkspaceShell';
import styles from '@/components/layout/DesktopWorkspaceShell.module.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.appShell} data-app-shell="true">
      <TopBar />

      <DesktopWorkspaceShell>{children}</DesktopWorkspaceShell>

      <BottomNav />
    </div>
  );
}
