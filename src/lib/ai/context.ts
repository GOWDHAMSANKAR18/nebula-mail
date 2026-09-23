import { AppContextState } from '@/types/assistant';

export function formatContextForLLM(context: AppContextState): string {
  const parts: string[] = [];

  parts.push(`Current Application View: ${context.currentView.toUpperCase()}`);

  if (context.currentEmail) {
    parts.push(`Active Currently Open Email:
- Message ID: ${context.currentEmail.id}
- Thread ID: ${context.currentEmail.threadId}
- From: ${context.currentEmail.from.name} <${context.currentEmail.from.email}>
- Subject: ${context.currentEmail.subject}
- Date: ${context.currentEmail.date}
- Snippet: ${context.currentEmail.snippet}`);
  } else {
    parts.push(`Active Email: None open`);
  }

  if (context.currentFilters) {
    parts.push(`Active Inbox Filters:
- Folder: ${context.currentFilters.folder || 'inbox'}
- Search Query: ${context.currentFilters.query || 'none'}
- From Filter: ${context.currentFilters.from || 'none'}
- Start Date: ${context.currentFilters.startDate || 'none'}
- Unread Only: ${context.currentFilters.unreadOnly ? 'YES' : 'NO'}`);
  }

  if (context.isComposeOpen && context.composeDraft) {
    parts.push(`Active Compose Drawer:
- To: ${context.composeDraft.to || '(empty)'}
- Subject: ${context.composeDraft.subject || '(empty)'}
- Body: ${context.composeDraft.body || '(empty)'}`);
  }

  return parts.join('\n\n');
}
