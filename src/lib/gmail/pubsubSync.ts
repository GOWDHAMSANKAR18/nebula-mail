import { EventEmitter } from 'events';
import { MailProvider } from '@/types/email';

class SyncEventEmitter extends EventEmitter {}

export const syncEvents = new SyncEventEmitter();

// Store last processed historyId to prevent duplicate processing
const processedHistoryIds = new Set<string>();

export interface PubSubNotification {
  emailAddress: string;
  historyId: string;
}

/**
 * Process incremental Gmail history changes using historyId
 */
export async function processGmailHistory(
  provider: MailProvider,
  historyId: string,
  accessToken: string
): Promise<{ newMessagesCount: number; historyId: string }> {
  if (processedHistoryIds.has(historyId)) {
    console.log(`[PubSub Sync] History ID ${historyId} already processed, skipping.`);
    return { newMessagesCount: 0, historyId };
  }

  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn(`[PubSub Sync] History API request failed with status ${res.status}`);
      return { newMessagesCount: 0, historyId };
    }

    const data = await res.json();
    const historyRecords = data.history || [];
    let newMessagesCount = 0;

    for (const record of historyRecords) {
      if (record.messagesAdded) {
        newMessagesCount += record.messagesAdded.length;
      }
    }

    processedHistoryIds.add(historyId);
    // Limit memory set size
    if (processedHistoryIds.size > 500) {
      const oldestKey = Array.from(processedHistoryIds)[0];
      processedHistoryIds.delete(oldestKey);
    }

    // Emit event to active SSE streams
    syncEvents.emit('gmail_push', {
      type: 'new_mail',
      historyId,
      newMessagesCount,
      timestamp: Date.now(),
    });

    return { newMessagesCount, historyId };
  } catch (err: any) {
    console.error('[PubSub Sync] Exception during history processing:', err?.message);
    return { newMessagesCount: 0, historyId };
  }
}
