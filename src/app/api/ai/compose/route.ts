import { NextRequest, NextResponse } from 'next/server';
import { generateNewEmail } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/compose
 * Generates a NEW email (subject + body) based on user prompt.
 * Does NOT require threadId or messageId.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, customInstruction, mode, writingStyle, profile } = body;

    const instruction =
      typeof prompt === 'string' && prompt.trim()
        ? prompt.trim()
        : typeof customInstruction === 'string' && customInstruction.trim()
          ? customInstruction.trim()
          : '';

    if (!instruction) {
      console.warn(
        '[API /api/ai/compose Validation Error]: Request rejected with 400. Neither "prompt" nor "customInstruction" contained a valid text string in request payload.',
        { mode, profile }
      );
      return NextResponse.json(
        { error: 'Instruction prompt is required to generate a new email.' },
        { status: 400 }
      );
    }

    const result = await generateNewEmail(mode, instruction, writingStyle, profile);

    return NextResponse.json({
      subject: result.subject,
      body: result.body,
    });
  } catch (err: any) {
    console.error('[API /api/ai/compose Generation Service Error]: AI generation processing failed:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate email content.' },
      { status: 500 }
    );
  }
}
