import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const provider = getMailProvider(accessToken);
    await provider.markAsRead(id, true);

    return NextResponse.json({ success: true, messageId: id });
  } catch (err: any) {
    console.error('[API /api/mail/message/[id]/read POST Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to mark message as read.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
