/**
 * @file route.ts
 * @description Endpoint HTTP POST (/api/gateway) que atua como ponto de entrada único para todas
 * as interações de IA, validando o contrato AIRequest, limite horário por usuário e delegando ao AIOrchestrator.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  checkAndRecordUserInteraction,
  createRateLimitExceededResponse,
} from '@/lib/ai/rateLimiter';
import { orchestrator } from '@/lib/ai/router';
import { AIRequest, AIResponse } from '@/lib/ai/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function resolveAuthenticatedUserId(fallbackUserId?: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return fallbackUserId || 'anonymous';
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignora escrita de cookie caso o contexto da resposta já esteja bloqueado
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || fallbackUserId || 'anonymous';
  } catch {
    return fallbackUserId || 'anonymous';
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const clinicalAiRequest: AIRequest = await request.json();

    if (!clinicalAiRequest.prompt || !clinicalAiRequest.role) {
      return NextResponse.json({ error: 'Missing prompt or role' }, { status: 400 });
    }

    const resolvedUserId = await resolveAuthenticatedUserId(clinicalAiRequest.userId);
    const rateLimitResult = checkAndRecordUserInteraction(resolvedUserId);

    if (!rateLimitResult.allowed) {
      const isJsonFormat = clinicalAiRequest.responseFormat === 'json';
      return NextResponse.json(
        createRateLimitExceededResponse(isJsonFormat, rateLimitResult.retryAfterMinutes)
      );
    }

    const clinicalAiResponse: AIResponse = await orchestrator.processRequest(clinicalAiRequest);
    return NextResponse.json(clinicalAiResponse);
  } catch (error: unknown) {
    console.error('Gateway Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}
