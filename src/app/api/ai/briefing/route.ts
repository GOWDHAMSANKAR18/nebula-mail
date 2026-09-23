import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { generateInboxBriefing } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const provider = getMailProvider(accessToken);

    const [{ messages: inboxMessages }, { messages: sentMessages }] = await Promise.all([
      provider.listMessages({ folder: 'inbox' }).catch(() => ({ messages: [] })),
      provider.listMessages({ folder: 'sent' }).catch(() => ({ messages: [] })),
    ]);

    const briefing = await generateInboxBriefing(inboxMessages || [], sentMessages || []);
    return NextResponse.json({ briefing });
  } catch (err: any) {
    console.error('[API /api/ai/briefing GET Error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to generate inbox briefing.' }, { status: 500 });
  }
}
