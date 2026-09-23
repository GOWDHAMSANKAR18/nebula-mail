export type AIReplyMode =
  | 'detailed'
  | 'brief'
  | 'professional'
  | 'friendly'
  | 'concise'
  | 'apologetic'
  | 'followup'
  | 'acknowledge'
  | 'clarify'
  | 'custom';

export type AIPriorityCategory =
  | 'action_required'
  | 'waiting_for_reply'
  | 'deadline'
  | 'meeting'
  | 'important'
  | 'newsletter'
  | 'notification'
  | 'low_priority';

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name?: string;
    email: string;
  }[];
  cc?: {
    name?: string;
    email: string;
  }[];
  subject: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  date: string; // ISO string or RFC date string
  timestamp: number; // Unix timestamp ms for fast sorting
  isRead: boolean;
  isStarred?: boolean;
  isDraft?: boolean;
  hasAttachment?: boolean;
  attachments?: EmailAttachment[];
  folder: 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts' | 'spam';
  labels?: string[];
  messageIdHeader?: string; // RFC Message-ID header
  aiPriority?: AIPriorityCategory;
  aiPriorityReason?: string;
  whyItMatters?: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  lastUpdated: string;
  snippet: string;
  isUnread: boolean;
  summary?: ThreadSummary;
  actionItems?: ActionItem[];
  meetingInfo?: MeetingInfo;
}

export interface ThreadSummary {
  shortSummary: string;
  topic: string;
  decisions: string[];
  actionItems: string[];
  peopleInvolved: string[];
  deadlines: string[];
  nextStep: string;
  openQuestions?: string[];
  keyPoints?: string[];
  latestStatus?: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner?: string;
  deadline?: string;
  evidence?: string;
  description?: string;
  assignee?: string;
  messageId?: string;
  status?: 'pending' | 'completed' | 'dismissed';
  isConfirmed?: boolean;
}

export interface FollowUpItem {
  id: string;
  threadId?: string;
  messageId?: string;
  fromName: string;
  fromEmail: string;
  reason: string;
  date: string;
  suggestedAction?: string;
}

export interface MeetingInfo {
  date?: string;
  time?: string;
  participants: string[];
  purpose?: string;
  messageId?: string;
}

export interface DraftReviewResult {
  isGoodToSend: boolean;
  summary: string;
  strengths: string[];
  unansweredQuestions: string[];
  unsupportedClaims: string[];
  accidentalCommitments: string[];
  toneWarnings: string[];
  suggestedModifications: string[];
}

export interface InboxBriefingItem {
  messageId: string;
  threadId: string;
  subject: string;
  fromName: string;
  snippet: string;
  reason: string;
  lastUpdated: string;
  deadline?: string;
}

export interface InboxBriefing {
  needsAttention: InboxBriefingItem[];
  waitingForYou: InboxBriefingItem[];
  waitingForOthers: InboxBriefingItem[];
  deadlines: InboxBriefingItem[];
  meetings: InboxBriefingItem[];
  fyi: InboxBriefingItem[];
}

export type AIProfile =
  | 'professional'
  | 'friendly'
  | 'concise'
  | 'technical'
  | 'creative'
  | 'executive';

export interface PrivacySettings {
  aiEnabled: boolean;
  askBeforeProcessing: boolean;
  provider: 'gemini' | 'ollama';
}

export interface WritingStyle {
  formality: 'formal' | 'friendly' | 'balanced';
  length: 'concise' | 'detailed' | 'balanced';
  includeGreetings: boolean;
  includeSignOff: boolean;
  selectedProfile?: AIProfile;
  customInstructions?: string;
}

export interface EmailFilters {
  query?: string;
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  unreadOnly?: boolean;
  starredOnly?: boolean;
  hasAttachment?: boolean;
  folder?: 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts' | 'spam';
  sort?: 'newest' | 'oldest';
  isAISearch?: boolean;
}

export interface ComposeDraft {
  id?: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  replyToId?: string;
  inReplyTo?: string;
  references?: string;
  isReply?: boolean;
  replyMode?: 'reply' | 'replyAll' | 'aiReply';
}

export interface MailProvider {
  listMessages(filters?: EmailFilters, pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }>;
  getMessage(messageId: string): Promise<EmailMessage>;
  getThread(threadId: string): Promise<EmailThread>;
  sendMessage(draft: ComposeDraft): Promise<{ success: boolean; messageId: string }>;
  saveDraft(draft: ComposeDraft): Promise<{ success: boolean; draftId: string }>;
  replyToMessage(messageId: string, body: string): Promise<{ success: boolean; messageId: string }>;
  markAsRead(messageId: string, isRead: boolean): Promise<void>;
  toggleStar(messageId: string): Promise<void>;
  trashMessage(messageId: string): Promise<void>;
  restoreMessage(messageId: string): Promise<void>;
  deletePermanently(messageId: string): Promise<void>;
}
