import { NextResponse } from 'next/server';
import { AIRequest } from '@/lib/ai/types';
import { orchestrator } from '@/lib/ai/router';

export async function POST(request: Request) {
  try {
    const body: AIRequest = await request.json();
    
    if (!body.prompt || !body.role) {
      return NextResponse.json({ error: 'Missing prompt or role' }, { status: 400 });
    }

    const response = await orchestrator.processRequest(body);
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Gateway Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
