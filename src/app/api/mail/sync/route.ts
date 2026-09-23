import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncEvents } from '@/lib/gmail/pubsubSync';

export const dynamic = 'force-dynamic';

/**
 * SSE Endpoint for Inbox Synchronization & Real-time Gmail Polling Fallback
 * 
 * Polling Interval Rationale:
 * - Interval: 20 seconds (20,000ms)
 * - Rationale: Gmail API permits 250 quota units/sec per user. Polling every 20 seconds uses ~5 quota units/min,
 *   which is well within rate limits (< 0.1% of quota), avoiding rate-limiting while providing near-instant inbox freshness.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const session: any = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  let lastTopMessageId: string | null = null;
  let isAborted = false;

  const customStream = new ReadableStream({
    async start(controller) {
      // Helper to push SSE data to client
      const pushEvent = (data: Record<string, any>) => {
        if (isAborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Controller closed or stream error
        }
      };

      // 1. Send initial connection event
      pushEvent({ type: 'connected', timestamp: Date.now() });

      // Helper function to check for Gmail updates
      const checkGmailUpdates = async () => {
        if (!accessToken || isAborted) return;

        try {
          const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            if (res.status === 401) {
              pushEvent({ type: 'auth_error', message: 'Session expired' });
            }
            return;
          }

          const data = await res.json();
          const messages = data.messages || [];
          if (messages.length > 0) {
            const currentTopId = messages[0].id;
            if (lastTopMessageId !== null && currentTopId !== lastTopMessageId) {
              pushEvent({
                type: 'new_mail',
                topMessageId: currentTopId,
                timestamp: Date.now(),
              });
            }
            lastTopMessageId = currentTopId;
          }
        } catch (err) {
          // Graceful handling of network failure or temporary API errors
          console.warn('[Sync SSE] Gmail poll error:', err);
        }
      };

      // Initial check to prime lastTopMessageId
      await checkGmailUpdates();

      // 2. Heartbeat ping interval (15 seconds)
      const heartbeatInterval = setInterval(() => {
        pushEvent({ type: 'ping', timestamp: Date.now() });
      }, 15000);

      // 3. Gmail Polling interval (20 seconds)
      const pollingInterval = setInterval(() => {
        checkGmailUpdates();
      }, 20000);

      // Subscribe to real-time Pub/Sub push events
      const handlePushEvent = (eventData: any) => {
        pushEvent(eventData);
      };
      syncEvents.on('gmail_push', handlePushEvent);

      // Handle client abort / disconnect
      req.signal.addEventListener('abort', () => {
        isAborted = true;
        syncEvents.removeListener('gmail_push', handlePushEvent);
        clearInterval(heartbeatInterval);
        clearInterval(pollingInterval);
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
