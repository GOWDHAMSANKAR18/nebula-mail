import { NextRequest, NextResponse } from 'next/server';
import { processAssistantRequest } from '@/lib/ai/assistantEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history, context, profile } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await processAssistantRequest(prompt, history || [], context || {}, profile);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Assistant API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
