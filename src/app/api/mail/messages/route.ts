import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { EmailFilters } from '@/types/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;
    const sessionError = (session as any)?.error;

    if (sessionError === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: 'Gmail access token expired and refresh failed. Please re-authenticate.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') as EmailFilters['folder'] || 'inbox';
    const query = searchParams.get('query') || undefined;
    const from = searchParams.get('from') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const starredOnly = searchParams.get('starredOnly') === 'true';
    const hasAttachment = searchParams.get('hasAttachment') === 'true';
    const sort = (searchParams.get('sort') as 'newest' | 'oldest') || undefined;

    const filters: EmailFilters = {
      folder,
      query,
      from,
      startDate,
      endDate,
      unreadOnly,
      starredOnly,
      hasAttachment,
      sort,
    };

    const provider = getMailProvider(accessToken);
    const result = await provider.listMessages(filters);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/mail/messages GET Error]:', err?.message);
    const is401 = err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED');
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch messages from Gmail.' },
      { status: is401 ? 401 : 500 }
    );
  }
}
