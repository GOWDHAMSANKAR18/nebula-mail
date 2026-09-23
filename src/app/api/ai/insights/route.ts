import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { EmailMessage } from '@/types/email';
import {
  summarizeThread,
  extractActionItems,
  detectMeetingInfo,
  analyzeEmailContext,
} from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const { threadId, messageId } = await req.json();

    if (!threadId && !messageId) {
      return NextResponse.json({ error: 'threadId or messageId is required.' }, { status: 400 });
    }

    const provider = getMailProvider(accessToken);
    let messages: EmailMessage[] = [];

    if (threadId) {
      try {
        const thread = await provider.getThread(threadId);
        messages = thread.messages || [];
      } catch (e) {
        // Fallback
      }
    }

    if (messages.length === 0 && messageId) {
      const msg = await provider.getMessage(messageId);
      messages = [msg];
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No conversation messages found.' }, { status: 404 });
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    const latestMsg = messages[messages.length - 1];

    const [summary, actionItems, meetingInfo, contextAnalysis] = await Promise.all([
      summarizeThread(messages),
      extractActionItems(messages),
      detectMeetingInfo(messages),
      analyzeEmailContext(latestMsg),
    ]);

    return NextResponse.json({
      summary,
      actionItems,
      meetingInfo,
      whyItMatters: contextAnalysis.whyItMatters,
      aiPriority: contextAnalysis.aiPriority,
      aiPriorityReason: contextAnalysis.aiPriorityReason,
    });
  } catch (err: any) {
    console.error('[API /api/ai/insights POST Error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to fetch thread insights.' }, { status: 500 });
  }
}
