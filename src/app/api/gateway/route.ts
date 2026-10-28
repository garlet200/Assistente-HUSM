/**
 * @file route.ts
 * @description Endpoint HTTP POST (/api/gateway) que atua como ponto de entrada único para todas
 * as interações de IA, validando o contrato AIRequest e delegando ao AIOrchestrator.
 */

import { NextResponse } from 'next/server';
import { AIRequest, AIResponse } from '@/lib/ai/types';
import { orchestrator } from '@/lib/ai/router';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const clinicalAiRequest: AIRequest = await request.json();

    if (!clinicalAiRequest.prompt || !clinicalAiRequest.role) {
      return NextResponse.json({ error: 'Missing prompt or role' }, { status: 400 });
    }

    const clinicalAiResponse: AIResponse = await orchestrator.processRequest(clinicalAiRequest);

    return NextResponse.json(clinicalAiResponse);
  } catch (error: unknown) {
    console.error('Gateway Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}
