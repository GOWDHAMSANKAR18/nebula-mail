import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { summarizeThread } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threadId, messageId, messages: clientMessages } = body;

    let threadMessages = clientMessages || [];

    if ((!threadMessages || threadMessages.length === 0) && (threadId || messageId)) {
      const session = await getServerSession(authOptions);
      const accessToken = (session as any)?.accessToken;
      const provider = getMailProvider(accessToken);

      if (threadId) {
        const thread = await provider.getThread(threadId);
        threadMessages = thread.messages;
      } else if (messageId) {
        const msg = await provider.getMessage(messageId);
        threadMessages = [msg];
      }
    }

    if (!threadMessages || threadMessages.length === 0) {
      return NextResponse.json(
        { error: 'No thread messages provided or found to summarize.' },
        { status: 400 }
      );
    }

    const summary = await summarizeThread(threadMessages);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('[API /api/ai/thread-summary POST Error]:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Failed to summarize thread.' },
      { status: 500 }
    );
  }
}
