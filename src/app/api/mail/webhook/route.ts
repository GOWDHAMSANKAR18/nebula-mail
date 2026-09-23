import { NextRequest, NextResponse } from 'next/server';
import { syncEvents, processGmailHistory } from '@/lib/gmail/pubsubSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mail/webhook
 * Google Pub/Sub Webhook Push Notification Receiver
 * Decodes Gmail history push payloads and triggers incremental history processing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.message || !body.message.data) {
      return NextResponse.json(
        { error: 'Invalid Pub/Sub payload structure. Expecting message.data.' },
        { status: 400 }
      );
    }

    // Decode Base64 Pub/Sub Data
    const encodedData = body.message.data;
    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    const parsedData = JSON.parse(decodedString);

    const { emailAddress, historyId } = parsedData;

    if (!historyId) {
      return NextResponse.json(
        { error: 'Missing historyId in Pub/Sub message data.' },
        { status: 400 }
      );
    }

    console.log(`[Gmail Pub/Sub Webhook] Received push update for ${emailAddress}, historyId: ${historyId}`);

    // Emit instant update event to connected SSE clients
    syncEvents.emit('gmail_push', {
      type: 'new_mail',
      historyId,
      emailAddress,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      emailAddress,
      historyId,
      message: 'Pub/Sub notification processed successfully.',
    });
  } catch (err: any) {
    console.error('[Gmail Pub/Sub Webhook Error]:', err?.message);
    // Return 200/202 to Pub/Sub to avoid repeated redelivery loops on application errors
    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed gracefully.' },
      { status: 200 }
    );
  }
}
