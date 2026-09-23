import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mail/watch
 * Calls Gmail users.watch() API to register Google Pub/Sub topic push notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required. Valid access token missing.' },
        { status: 401 }
      );
    }

    const topicName = process.env.GMAIL_PUBSUB_TOPIC || req.headers.get('x-gmail-topic');

    if (!topicName) {
      return NextResponse.json(
        {
          error: 'GMAIL_PUBSUB_TOPIC environment variable or x-gmail-topic header is required for Pub/Sub push subscription.',
          fallback: 'Using 20-second SSE polling fallback.',
        },
        { status: 400 }
      );
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX'],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Gmail watch API failed (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      historyId: data.historyId,
      expiration: data.expiration,
      message: 'Gmail watch subscription active.',
    });
  } catch (err: any) {
    console.error('[API /api/mail/watch Error]:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Failed to setup Gmail watch subscription.' },
      { status: 500 }
    );
  }
}
