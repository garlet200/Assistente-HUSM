'use client';

/**
 * @file Providers.tsx
 * @description Wrapper de provedores globais de contexto React (AuthProvider) injetado no RootLayout.
 */

import React from 'react';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
