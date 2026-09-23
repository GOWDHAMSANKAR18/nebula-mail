import { EmailFilters, EmailMessage, ComposeDraft, AIProfile } from './email';

export type ToolName =
  | 'searchEmails'
  | 'openEmail'
  | 'openCompose'
  | 'fillCompose'
  | 'sendEmail'
  | 'replyToEmail'
  | 'forwardEmail'
  | 'applyFilter'
  | 'navigateTo';

export interface AssistantToolCall {
  id: string;
  name: ToolName;
  args: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'requires_confirmation';
  result?: any;
  error?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: AssistantToolCall[];
  planSteps?: {
    title: string;
    description?: string;
    status: 'pending' | 'executing' | 'completed' | 'cancelled';
  }[];
  emailPreviews?: EmailMessage[];
  pendingConfirmation?: {
    type: 'send_email';
    draft: ComposeDraft;
    toolCallId: string;
  };
}

export interface AppContextState {
  currentView: 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts' | 'spam' | 'email' | 'compose' | 'workspace';
  currentEmailId?: string;
  currentThreadId?: string;
  currentEmail?: EmailMessage;
  currentFilters: EmailFilters;
  composeDraft?: ComposeDraft;
  isComposeOpen: boolean;
  selectedMessageIds: string[];
  selectedProfile?: AIProfile;
}
