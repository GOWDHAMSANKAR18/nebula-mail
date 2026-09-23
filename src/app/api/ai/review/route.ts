import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { EmailMessage } from '@/types/email';
import { reviewDraft } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const { draftBody, threadId, messageId } = await req.json();

    if (!draftBody) {
      return NextResponse.json({ error: 'draftBody is required.' }, { status: 400 });
    }

    const provider = getMailProvider(accessToken);
    let messages: EmailMessage[] = [];

    if (threadId) {
      try {
        const thread = await provider.getThread(threadId);
        messages = thread.messages || [];
      } catch (e) {
        // Fallback to single message
      }
    }

    if (messages.length === 0 && messageId) {
      const msg = await provider.getMessage(messageId);
      messages = [msg];
    }

    const review = await reviewDraft(draftBody, messages);

    return NextResponse.json({ review });
  } catch (err: any) {
    console.error('[API /api/ai/review POST Error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to review draft.' }, { status: 500 });
  }
}
