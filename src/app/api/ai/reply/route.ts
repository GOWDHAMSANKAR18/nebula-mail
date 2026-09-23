import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { EmailMessage, AIReplyMode, WritingStyle } from '@/types/email';
import { generateThreadReply } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const {
      threadId,
      messageId,
      mode = 'professional',
      customInstruction,
      writingStyle,
      profile,
    } = await req.json();

    if (!threadId && !messageId) {
      return NextResponse.json({ error: 'Please open an email before using AI Reply.' }, { status: 400 });
    }

    const provider = getMailProvider(accessToken);
    let messages: EmailMessage[] = [];

    if (threadId) {
      try {
        const thread = await provider.getThread(threadId);
        messages = thread.messages || [];
      } catch (e) {
        console.warn('Could not fetch full thread, falling back to messageId:', e);
      }
    }

    if (messages.length === 0 && messageId) {
      try {
        const msg = await provider.getMessage(messageId);
        if (msg) messages = [msg];
      } catch (e) {
        console.warn('Could not fetch message by messageId:', messageId, e);
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Please open an email before using AI Reply.' }, { status: 404 });
    }

    // Sort messages chronologically
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // Call server-side AI generator (supporting 8 modes, custom prompt, writing style & AI profile)
    const replyText = await generateThreadReply(
      messages,
      mode as AIReplyMode,
      customInstruction,
      writingStyle as WritingStyle,
      profile
    );

    // Return generated reply ONLY. DO NOT send email!
    return NextResponse.json({ reply: replyText });
  } catch (err: any) {
    console.error('[API /api/ai/reply POST Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to generate AI reply.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
