import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMailProvider } from '@/lib/gmail/provider';
import { translateNaturalLanguageSearch } from '@/lib/ai/aiService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    const { query } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ messages: [], gmailQuery: '' });
    }

    // Convert natural language query into Gmail API query syntax (or keep raw if already structured)
    const gmailQuery = await translateNaturalLanguageSearch(query);

    const provider = getMailProvider(accessToken);
    const { messages } = await provider.listMessages({ query: gmailQuery });

    return NextResponse.json({ messages: messages || [], gmailQuery });
  } catch (err: any) {
    console.error('[API /api/ai/search POST Error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to execute natural language search.' }, { status: 500 });
  }
}
