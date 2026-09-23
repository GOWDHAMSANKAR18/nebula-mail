import { EmailFilters, EmailMessage, EmailThread, MailProvider, ComposeDraft } from '@/types/email';
import { subDays, subHours, formatISO } from 'date-fns';

const now = new Date();

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'msg-101',
    threadId: 'thread-1',
    from: { name: 'David Miller', email: 'david@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Production Deployment Status & v2.4 Release Notes',
    snippet: 'Hey team, the production deployment for v2.4 completed smoothly at 03:00 UTC. All health checks and latency benchmarks are passing.',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hi team,</p>
        <p>The production deployment for <strong>v2.4</strong> completed smoothly at 03:00 UTC. All automated health checks, database migrations, and latency benchmarks are passing within our sub-50ms target.</p>
        <h4 style="color: #3b82f6;">Release Highlights:</h4>
        <ul>
          <li>Optimized vector indexing throughput (+35% speedup)</li>
          <li>Resolved SSE connection drop issue on client reconnect</li>
          <li>Added human-in-the-loop confirmation modal for action workflows</li>
        </ul>
        <p>Please monitor your respective service dashboards and report any anomalies immediately.</p>
        <p>Best regards,<br/><strong>David Miller</strong><br/>Lead DevOps Engineer</p>
      </div>
    `,
    bodyText: "Hi team, The production deployment for v2.4 completed smoothly at 03:00 UTC. All automated health checks, database migrations, and latency benchmarks are passing.",
    date: formatISO(subHours(now, 2)),
    timestamp: subHours(now, 2).getTime(),
    isRead: false,
    isStarred: true,
    folder: 'inbox',
    labels: ['IMPORTANT', 'DEPLOYMENT']
  },
  {
    id: 'msg-102',
    threadId: 'thread-2',
    from: { name: 'Sarah Jenkins', email: 'sarah@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Project Update: Q3 AI Copilot Roadmap & Design Specs',
    snippet: 'Hi! Here is the updated project roadmap for our AI Copilot integration. We finalized the Zod schema tool definitions and UI preview components.',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hi everyone,</p>
        <p>I wanted to share the latest <strong>Project Update</strong> for the Q3 AI Copilot launch!</p>
        <p>We've successfully aligned on the core architecture:</p>
        <ol>
          <li>Structured assistant tools with strict Zod runtime validation</li>
          <li>Direct UI control state machine for seamless view navigation</li>
          <li>Human-In-The-Loop safety protocol for message dispatches</li>
        </ol>
        <p>Let me know if you have any feedback before our sync tomorrow afternoon at 3:00 PM.</p>
        <p>Cheers,<br/><strong>Sarah Jenkins</strong><br/>Head of Product</p>
      </div>
    `,
    bodyText: "Hi everyone, I wanted to share the latest Project Update for the Q3 AI Copilot launch! We've successfully aligned on the core architecture...",
    date: formatISO(subDays(now, 2)),
    timestamp: subDays(now, 2).getTime(),
    isRead: false,
    isStarred: false,
    folder: 'inbox',
    labels: ['PROJECT', 'PRODUCT']
  },
  {
    id: 'msg-103',
    threadId: 'thread-3',
    from: { name: 'Alex Rivera', email: 'alex@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Security Audit Findings & Token Storage Guidelines',
    snippet: 'The quarterly security audit report is ready. Please review the updated OAuth 2.0 refresh token rotation and server-side secret rules.',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hello Team,</p>
        <p>Our external security audit report for Q3 has arrived with a clean bill of health. A couple of recommended hardening steps to keep in mind:</p>
        <ul>
          <li>Never expose Google OAuth Client Secrets or raw API tokens to client bundles</li>
          <li>Enforce HTTP-only, SameSite cookies for session management</li>
          <li>Sanitize all incoming email HTML bodies prior to rendering in the DOM</li>
        </ul>
        <p>Detailed PDF report is attached to the security drive.</p>
        <p>Thanks,<br/><strong>Alex Rivera</strong><br/>InfoSec Lead</p>
      </div>
    `,
    bodyText: "Hello Team, Our external security audit report for Q3 has arrived with a clean bill of health...",
    date: formatISO(subDays(now, 4)),
    timestamp: subDays(now, 4).getTime(),
    isRead: true,
    isStarred: true,
    folder: 'inbox',
    labels: ['SECURITY']
  },
  {
    id: 'msg-104',
    threadId: 'thread-4',
    from: { name: 'Sarah Jenkins', email: 'sarah@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Feedback on UI Animation & Assistant Glassmorphism',
    snippet: 'Loved the smooth assistant typing animation and dark mode contrast! Could we ensure confirmation cards have crisp action buttons?',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hi,</p>
        <p>The initial build demo looked incredible! The assistant typing indicator and dark theme look very premium.</p>
        <p>One small request: make sure the confirmation card for email sending pops out clearly with prominent [Confirm Send] and [Cancel] buttons.</p>
        <p>Thanks,<br/>Sarah</p>
      </div>
    `,
    bodyText: "Hi, The initial build demo looked incredible! The assistant typing indicator and dark theme look very premium...",
    date: formatISO(subDays(now, 6)),
    timestamp: subDays(now, 6).getTime(),
    isRead: true,
    isStarred: false,
    folder: 'inbox',
    labels: ['DESIGN']
  },
  {
    id: 'msg-105',
    threadId: 'thread-5',
    from: { name: 'David Miller', email: 'david@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Database Migration Script & SQLite Fallback Sync',
    snippet: 'Attached is the database migration schema for storing email cache metadata and assistant conversation sessions.',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hi,</p>
        <p>I've pushed the updated database schema migrations. We're tracking users, OAuth sessions, cached headers, and assistant action logs.</p>
        <p>Let me know if you run into any issues during local migrations.</p>
        <p>Cheers,<br/>David</p>
      </div>
    `,
    bodyText: "Hi, I've pushed the updated database schema migrations. We're tracking users, OAuth sessions, cached headers...",
    date: formatISO(subDays(now, 8)),
    timestamp: subDays(now, 8).getTime(),
    isRead: true,
    isStarred: false,
    folder: 'inbox',
    labels: ['DATABASE']
  },
  {
    id: 'msg-106',
    threadId: 'thread-6',
    from: { name: 'Nebula Hiring Committee', email: 'hiring@nebula.io' },
    to: [{ name: 'You', email: 'user@nebula.io' }],
    subject: 'Welcome to Nebula KnowLab Engineering Task',
    snippet: 'Welcome to the Nebula KnowLab evaluation project. Build an extraordinary AI Mail Copilot with tool execution, real Gmail API, and high visual standards.',
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Welcome Candidate!</p>
        <p>We are excited to review your submission for the <strong>Nebula KnowLab Engineering Task</strong>.</p>
        <p>Key goals for your build:</p>
        <ul>
          <li>Demonstrate direct AI control over the application UI (searching, navigating, composing, replying)</li>
          <li>Integrate Google OAuth 2.0 and real Gmail API messaging</li>
          <li>Enforce Human-In-The-Loop safety before sending messages</li>
          <li>Deliver rich visual polish, dark mode, and responsive layout</li>
        </ul>
        <p>Good luck!</p>
      </div>
    `,
    bodyText: "Welcome Candidate! We are excited to review your submission for the Nebula KnowLab Engineering Task...",
    date: formatISO(subDays(now, 12)),
    timestamp: subDays(now, 12).getTime(),
    isRead: true,
    isStarred: true,
    folder: 'inbox',
    labels: ['ONBOARDING']
  },
  {
    id: 'msg-sent-1',
    threadId: 'thread-sent-1',
    from: { name: 'You', email: 'user@nebula.io' },
    to: [{ name: 'John Doe', email: 'john@example.com' }],
    subject: 'Meeting Tomorrow',
    snippet: "Let's meet at 3pm to review the architecture specifications and assistant tool bindings.",
    bodyHtml: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>Hi John,</p>
        <p>Let's meet at 3pm tomorrow to review the architecture specifications and assistant tool bindings.</p>
        <p>Best regards,<br/>Nebula Mail User</p>
      </div>
    `,
    bodyText: "Hi John, Let's meet at 3pm tomorrow to review the architecture specifications and assistant tool bindings.",
    date: formatISO(subDays(now, 1)),
    timestamp: subDays(now, 1).getTime(),
    isRead: true,
    isStarred: false,
    folder: 'sent'
  }
];

export class DemoMailProvider implements MailProvider {
  private messages: EmailMessage[];

  constructor() {
    this.messages = [...INITIAL_EMAILS];
  }

  async listMessages(filters?: EmailFilters): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
    let result = [...this.messages];

    // Filter by folder
    const targetFolder = filters?.folder || 'inbox';
    if (targetFolder === 'starred') {
      result = result.filter(m => m.isStarred);
    } else {
      result = result.filter(m => m.folder === targetFolder);
    }

    // Unread filter
    if (filters?.unreadOnly) {
      result = result.filter(m => !m.isRead);
    }

    // Starred filter
    if (filters?.starredOnly) {
      result = result.filter(m => m.isStarred);
    }

    // From filter
    if (filters?.from) {
      const fromLower = filters.from.toLowerCase();
      result = result.filter(
        m => m.from.name.toLowerCase().includes(fromLower) || m.from.email.toLowerCase().includes(fromLower)
      );
    }

    // Date filters
    if (filters?.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      result = result.filter(m => m.timestamp >= startMs);
    }
    if (filters?.endDate) {
      const endMs = new Date(filters.endDate).getTime() + 86400000; // end of day
      result = result.filter(m => m.timestamp <= endMs);
    }

    // Text query filter
    if (filters?.query) {
      const qLower = filters.query.toLowerCase();
      result = result.filter(
        m =>
          m.subject.toLowerCase().includes(qLower) ||
          m.snippet.toLowerCase().includes(qLower) ||
          m.from.name.toLowerCase().includes(qLower) ||
          m.from.email.toLowerCase().includes(qLower)
      );
    }

    // Attachment filter
    if (filters?.hasAttachment) {
      result = result.filter(m => m.hasAttachment);
    }

    // Sort by timestamp: ascending for 'oldest', descending for 'newest' / default
    if (filters?.sort === 'oldest') {
      result.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      result.sort((a, b) => b.timestamp - a.timestamp);
    }

    return { messages: result };
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    const found = this.messages.find(m => m.id === messageId);
    if (!found) {
      throw new Error(`Email message with ID ${messageId} not found`);
    }
    return found;
  }

  async getThread(threadId: string): Promise<EmailThread> {
    const threadMsgs = this.messages.filter(m => m.threadId === threadId);
    if (threadMsgs.length === 0) {
      throw new Error(`Thread with ID ${threadId} not found`);
    }
    threadMsgs.sort((a, b) => a.timestamp - b.timestamp);
    const lastMsg = threadMsgs[threadMsgs.length - 1];

    return {
      id: threadId,
      subject: lastMsg.subject,
      messages: threadMsgs,
      lastUpdated: lastMsg.date,
      snippet: lastMsg.snippet,
      isUnread: threadMsgs.some(m => !m.isRead)
    };
  }

  async sendMessage(draft: ComposeDraft): Promise<{ success: boolean; messageId: string }> {
    const newId = `msg-${Date.now()}`;
    const newMsg: EmailMessage = {
      id: newId,
      threadId: draft.threadId || `thread-${Date.now()}`,
      from: { name: 'You', email: 'user@nebula.io' },
      to: [{ name: draft.to, email: draft.to }],
      subject: draft.subject || '(No Subject)',
      snippet: draft.body.substring(0, 100),
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${draft.body.replace(/\n/g, '<br/>')}</div>`,
      bodyText: draft.body,
      date: formatISO(new Date()),
      timestamp: Date.now(),
      isRead: true,
      folder: 'sent'
    };

    this.messages.unshift(newMsg);
    return { success: true, messageId: newId };
  }

  async saveDraft(draft: ComposeDraft): Promise<{ success: boolean; draftId: string }> {
    const newId = `draft-${Date.now()}`;
    const newDraft: EmailMessage = {
      id: newId,
      threadId: draft.threadId || `thread-${Date.now()}`,
      from: { name: 'You', email: 'user@nebula.io' },
      to: [{ email: draft.to || 'draft@nebula.io' }],
      subject: draft.subject || '(No Subject)',
      snippet: draft.body ? draft.body.substring(0, 100) : '',
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${(draft.body || '').replace(/\n/g, '<br/>')}</div>`,
      bodyText: draft.body || '',
      date: formatISO(new Date()),
      timestamp: Date.now(),
      isRead: true,
      isDraft: true,
      folder: 'drafts'
    };

    this.messages.unshift(newDraft);
    return { success: true, draftId: newId };
  }

  async replyToMessage(messageId: string, body: string): Promise<{ success: boolean; messageId: string }> {
    const parentMsg = await this.getMessage(messageId);
    const newId = `msg-${Date.now()}`;

    const replyMsg: EmailMessage = {
      id: newId,
      threadId: parentMsg.threadId,
      from: { name: 'You', email: 'user@nebula.io' },
      to: [parentMsg.from],
      subject: parentMsg.subject.startsWith('Re:') ? parentMsg.subject : `Re: ${parentMsg.subject}`,
      snippet: body.substring(0, 100),
      bodyHtml: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <p>${body.replace(/\n/g, '<br/>')}</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;"/>
          <blockquote style="color: #64748b; border-left: 3px solid #cbd5e1; padding-left: 12px;">
            <p><strong>On ${parentMsg.date}, ${parentMsg.from.name} (${parentMsg.from.email}) wrote:</strong></p>
            ${parentMsg.bodyHtml}
          </blockquote>
        </div>
      `,
      bodyText: body,
      date: formatISO(new Date()),
      timestamp: Date.now(),
      isRead: true,
      folder: 'sent'
    };

    this.messages.unshift(replyMsg);
    return { success: true, messageId: newId };
  }

  async markAsRead(messageId: string, isRead: boolean): Promise<void> {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.isRead = isRead;
    }
  }

  async toggleStar(messageId: string): Promise<void> {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.isStarred = !msg.isStarred;
    }
  }

  async trashMessage(messageId: string): Promise<void> {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.folder = 'trash';
    }
  }

  async restoreMessage(messageId: string): Promise<void> {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.folder = 'inbox';
    }
  }

  async deletePermanently(messageId: string): Promise<void> {
    this.messages = this.messages.filter(m => m.id !== messageId);
  }
}
