import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { ComposeDraft } from '@/types/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const draft: ComposeDraft = await req.json();

    if (!draft.to) {
      return NextResponse.json({ error: 'Recipient address (to) is required.' }, { status: 400 });
    }

    const provider = getMailProvider(accessToken);
    const result = await provider.sendMessage(draft);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/mail/send POST Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to send email via Gmail API.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
