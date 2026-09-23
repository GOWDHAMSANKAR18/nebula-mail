import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;
    const sessionError = (session as any)?.error;

    if (sessionError === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: 'Gmail access token expired. Please re-authenticate.' },
        { status: 401 }
      );
    }

    const provider = getMailProvider(accessToken);
    const thread = await provider.getThread(threadId);

    return NextResponse.json(thread);
  } catch (err: any) {
    console.error('[API /api/mail/thread/[id] GET Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch thread from Gmail.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
