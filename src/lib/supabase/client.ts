/**
 * @file client.ts
 * @description Fábrica do cliente Supabase para execução no navegador (@supabase/ssr),
 * utilizado para autenticação e persistência das tabelas `chats` e `messages`.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
}
