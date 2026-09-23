import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const { messageId } = await req.json();

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required.' }, { status: 400 });
    }

    const provider = getMailProvider(accessToken);
    await provider.deletePermanently(messageId);

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error('[API /api/mail/trash/permanent DELETE Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to permanently delete email.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
