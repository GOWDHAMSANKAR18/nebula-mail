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
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const provider = getMailProvider(accessToken);
    const message = await provider.getMessage(id);

    return NextResponse.json(message);
  } catch (err: any) {
    console.error('[API /api/mail/message/[id] GET Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch email details.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
