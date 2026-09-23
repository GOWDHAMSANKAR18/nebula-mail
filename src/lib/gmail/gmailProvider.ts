import { EmailFilters, EmailMessage, EmailThread, MailProvider, ComposeDraft } from '@/types/email';
import { buildGmailQueryString } from './parser';

export class GmailMailProvider implements MailProvider {
  private accessToken: string;
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  // In-Memory Message & Thread Cache (3-minute TTL) for drastic request reduction
  private static messageCache = new Map<string, { message: EmailMessage; timestamp: number }>();
  private static threadCache = new Map<string, { thread: EmailThread; timestamp: number }>();
  private static CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Helper to execute Gmail API requests with exponential backoff for 403/429 rate limit responses.
   */
  private async fetchGmail<T>(endpoint: string, options: RequestInit = {}, retries = 3, backoffMs = 1000): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (res.status === 403 || res.status === 429) {
          const errorText = await res.text();
          const isRateLimit =
            errorText.includes('rateLimitExceeded') ||
            errorText.includes('userRateLimitExceeded') ||
            errorText.includes('Quota') ||
            res.status === 429;

          if (isRateLimit && attempt < retries) {
            const waitTime = backoffMs * Math.pow(2, attempt);
            console.warn(`[Gmail API Rate Limit (${res.status})] Exponential backoff attempt ${attempt + 1}/${retries} after ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`Gmail API Rate Limit Exceeded (403/429): ${errorText}`);
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Gmail API error (${res.status}): ${errorText}`);
        }

        return res.json();
      } catch (err: any) {
        if (attempt === retries || !err?.message?.includes('Rate Limit Exceeded')) {
          throw err;
        }
      }
    }
    throw new Error('Gmail API request failed after exponential backoff retries.');
  }

  async listMessages(filters?: EmailFilters, pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
    const qStr = filters ? buildGmailQueryString(filters) : '';
    const params = new URLSearchParams({
      maxResults: '20',
      ...(qStr ? { q: qStr } : {}),
      ...(pageToken ? { pageToken } : {}),
    });

    const data = await this.fetchGmail<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string }>(
      `/messages?${params.toString()}`
    );

    if (!data.messages || data.messages.length === 0) {
      return { messages: [] };
    }

    // Process chunked fetches (5 at a time) to prevent hitting quota limits simultaneously
    const rawIds = data.messages.slice(0, 20).map(m => m.id);
    const messages: EmailMessage[] = [];
    const chunkSize = 5;

    for (let i = 0; i < rawIds.length; i += chunkSize) {
      const chunk = rawIds.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(id => this.getMessage(id)));
      messages.push(...chunkResults);
    }

    if (filters?.sort === 'oldest') {
      messages.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      messages.sort((a, b) => b.timestamp - a.timestamp);
    }

    return {
      messages,
      nextPageToken: data.nextPageToken,
    };
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    const cached = GmailMailProvider.messageCache.get(messageId);
    if (cached && Date.now() - cached.timestamp < GmailMailProvider.CACHE_TTL_MS) {
      return cached.message;
    }

    const raw = await this.fetchGmail<any>(`/messages/${messageId}?format=full`);
    const parsed = this.parseGmailMessage(raw);

    GmailMailProvider.messageCache.set(messageId, { message: parsed, timestamp: Date.now() });
    return parsed;
  }

  async getThread(threadId: string): Promise<EmailThread> {
    const cached = GmailMailProvider.threadCache.get(threadId);
    if (cached && Date.now() - cached.timestamp < GmailMailProvider.CACHE_TTL_MS) {
      return cached.thread;
    }

    const raw = await this.fetchGmail<any>(`/threads/${threadId}?format=full`);
    const messages: EmailMessage[] = (raw.messages || []).map((m: any) => this.parseGmailMessage(m));
    
    messages.sort((a, b) => a.timestamp - b.timestamp);
    const lastMsg = messages[messages.length - 1] || {};

    const thread: EmailThread = {
      id: threadId,
      subject: lastMsg.subject || '(No Subject)',
      messages,
      lastUpdated: lastMsg.date || new Date().toISOString(),
      snippet: lastMsg.snippet || '',
      isUnread: messages.some(m => !m.isRead),
    };

    GmailMailProvider.threadCache.set(threadId, { thread, timestamp: Date.now() });
    return thread;
  }

  async sendMessage(draft: ComposeDraft): Promise<{ success: boolean; messageId: string }> {
    const headersList: string[] = [
      `To: ${draft.to}`,
    ];

    if (draft.cc && draft.cc.trim()) {
      headersList.push(`Cc: ${draft.cc.trim()}`);
    }

    headersList.push(`Subject: ${draft.subject}`);

    if (draft.inReplyTo && draft.inReplyTo.trim()) {
      headersList.push(`In-Reply-To: ${draft.inReplyTo.trim()}`);
    }

    if (draft.references && draft.references.trim()) {
      headersList.push(`References: ${draft.references.trim()}`);
    }

    headersList.push('Content-Type: text/html; charset=utf-8');
    headersList.push('');
    headersList.push(draft.body.replace(/\n/g, '<br/>'));

    const rawEmail = headersList.join('\r\n');

    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await this.fetchGmail<{ id: string }>('/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        raw: encodedEmail,
        ...(draft.threadId ? { threadId: draft.threadId } : {}),
      }),
    });

    // Invalidate message and thread cache on new message send
    GmailMailProvider.messageCache.clear();
    GmailMailProvider.threadCache.clear();

    return { success: true, messageId: res.id };
  }

  async saveDraft(draft: ComposeDraft): Promise<{ success: boolean; draftId: string }> {
    const headersList = [
      `To: ${draft.to}`,
    ];

    if (draft.cc && draft.cc.trim()) {
      headersList.push(`Cc: ${draft.cc.trim()}`);
    }

    headersList.push(`Subject: ${draft.subject}`);

    if (draft.inReplyTo && draft.inReplyTo.trim()) {
      headersList.push(`In-Reply-To: ${draft.inReplyTo.trim()}`);
    }

    if (draft.references && draft.references.trim()) {
      headersList.push(`References: ${draft.references.trim()}`);
    }

    headersList.push('Content-Type: text/html; charset=utf-8');
    headersList.push('');
    headersList.push((draft.body || '').replace(/\n/g, '<br/>'));

    const rawEmail = headersList.join('\r\n');

    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await this.fetchGmail<{ id: string }>('/drafts', {
      method: 'POST',
      body: JSON.stringify({
        message: {
          raw: encodedEmail,
          ...(draft.threadId ? { threadId: draft.threadId } : {}),
        },
      }),
    });

    return { success: true, draftId: res.id };
  }

  async replyToMessage(messageId: string, body: string): Promise<{ success: boolean; messageId: string }> {
    const parent = await this.getMessage(messageId);
    const subject = parent.subject.startsWith('Re:') ? parent.subject : `Re: ${parent.subject}`;
    
    const draft: ComposeDraft = {
      to: parent.from.email,
      subject,
      body,
      threadId: parent.threadId,
      replyToId: messageId,
      inReplyTo: parent.messageIdHeader || parent.id,
      references: parent.messageIdHeader || parent.id,
    };

    return this.sendMessage(draft);
  }

  async markAsRead(messageId: string, isRead: boolean): Promise<void> {
    await this.fetchGmail(`/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: isRead ? ['UNREAD'] : [],
        addLabelIds: !isRead ? ['UNREAD'] : [],
      }),
    });
    // Invalidate cached message
    GmailMailProvider.messageCache.delete(messageId);
  }

  async toggleStar(messageId: string): Promise<void> {
    const msg = await this.getMessage(messageId);
    const isStarred = msg.isStarred;
    
    await this.fetchGmail(`/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: isStarred ? ['STARRED'] : [],
        addLabelIds: !isStarred ? ['STARRED'] : [],
      }),
    });
    // Invalidate cached message
    GmailMailProvider.messageCache.delete(messageId);
  }

  async trashMessage(messageId: string): Promise<void> {
    await this.fetchGmail(`/messages/${messageId}/trash`, {
      method: 'POST',
    });
    GmailMailProvider.messageCache.delete(messageId);
  }

  async restoreMessage(messageId: string): Promise<void> {
    await this.fetchGmail(`/messages/${messageId}/untrash`, {
      method: 'POST',
    });
    GmailMailProvider.messageCache.delete(messageId);
  }

  async deletePermanently(messageId: string): Promise<void> {
    await this.fetchGmail(`/messages/${messageId}`, {
      method: 'DELETE',
    });
    GmailMailProvider.messageCache.delete(messageId);
  }

  private parseGmailMessage(raw: any): EmailMessage {
    const headers = raw.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const fromHeader = getHeader('From');
    const toHeader = getHeader('To');
    const ccHeader = getHeader('Cc');
    const subject = getHeader('Subject') || '(No Subject)';
    const dateStr = getHeader('Date') || new Date().toISOString();
    const messageIdHeader = getHeader('Message-ID') || getHeader('Message-Id');
    const timestamp = new Date(dateStr).getTime() || parseInt(raw.internalDate, 10) || Date.now();

    // Parse From email and name
    const fromMatch = fromHeader.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+)>?$/);
    const from = {
      name: fromMatch?.[1] || fromMatch?.[2] || fromHeader || 'Unknown',
      email: fromMatch?.[2] || fromHeader,
    };

    // Parse CC recipients
    const cc: { name?: string; email: string }[] = [];
    if (ccHeader) {
      ccHeader.split(',').forEach((c: string) => {
        const trimmed = c.trim();
        const match = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+)>?$/);
        if (match?.[2]) {
          cc.push({ name: match[1] || match[2], email: match[2] });
        } else if (trimmed) {
          cc.push({ email: trimmed });
        }
      });
    }

    const labelIds: string[] = raw.labelIds || [];
    const isUnread = labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');
    const isSent = labelIds.includes('SENT');
    const isTrash = labelIds.includes('TRASH');
    const isSpam = labelIds.includes('SPAM');
    const isDraft = labelIds.includes('DRAFT');

    let folder: 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts' | 'spam' = 'inbox';
    if (isTrash) folder = 'trash';
    else if (isSpam) folder = 'spam';
    else if (isDraft) folder = 'drafts';
    else if (isSent) folder = 'sent';

    // Safe URL-safe Base64 decoder
    const decodeBase64 = (str: string) => {
      try {
        const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(normalized, 'base64').toString('utf-8');
      } catch (e) {
        return str;
      }
    };

    // Body & Attachment parsing helper
    let bodyHtml = '';
    let bodyText = '';
    const attachments: { id: string; filename: string; mimeType: string; size: number }[] = [];

    const parseParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.filename.trim().length > 0) {
          attachments.push({
            id: part.body?.attachmentId || part.partId || `att-${attachments.length}`,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body?.size || 0,
          });
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = decodeBase64(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = decodeBase64(part.body.data);
        } else if (part.parts) {
          parseParts(part.parts);
        }
      }
    };

    if (raw.payload?.parts) {
      parseParts(raw.payload.parts);
    } else if (raw.payload?.body?.data) {
      const dataStr = decodeBase64(raw.payload.body.data);
      if (raw.payload.mimeType === 'text/html') {
        bodyHtml = dataStr;
      } else {
        bodyText = dataStr;
      }
    }

    if (!bodyHtml && bodyText) {
      bodyHtml = `<div style="font-family: sans-serif; line-height: 1.6;">${bodyText.replace(/\n/g, '<br/>')}</div>`;
    }
    if (!bodyText && bodyHtml) {
      bodyText = bodyHtml.replace(/<[^>]+>/g, '');
    }

    let deliveryStatus: 'sent' | 'accepted' | 'failed' | undefined = undefined;
    let failureReason: string | undefined = undefined;

    if (
      from.email.toLowerCase().includes('mailer-daemon') ||
      subject.toLowerCase().includes('delivery status notification') ||
      subject.toLowerCase().includes('undeliverable') ||
      subject.toLowerCase().includes('returned mail')
    ) {
      deliveryStatus = 'failed';
      failureReason = 'Delivery Status Notification (DSN): Address rejected or bounced by destination mail server.';
    } else if (isSent || folder === 'sent') {
      deliveryStatus = 'accepted';
    }

    return {
      id: raw.id,
      threadId: raw.threadId,
      from,
      to: [{ email: toHeader }],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      snippet: raw.snippet || bodyText.substring(0, 100),
      bodyHtml,
      bodyText,
      date: dateStr,
      timestamp,
      isRead: !isUnread,
      isStarred,
      hasAttachment: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments : undefined,
      folder,
      labels: labelIds,
      messageIdHeader: messageIdHeader || `<${raw.id}@mail.gmail.com>`,
    };
  }
}
