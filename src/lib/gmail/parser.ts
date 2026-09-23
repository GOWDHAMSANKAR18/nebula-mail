import { EmailFilters } from '@/types/email';
import { subDays, startOfWeek, format } from 'date-fns';

export function parseNaturalLanguageQuery(queryStr: string): EmailFilters {
  const lower = queryStr.toLowerCase().trim();
  const filters: EmailFilters = {};

  // Unread filter
  if (lower.includes('unread')) {
    filters.unreadOnly = true;
  }

  // Starred filter
  if (lower.includes('starred') || lower.includes('flagged')) {
    filters.starredOnly = true;
    filters.folder = 'starred';
  } else if (lower.includes('sent') || lower.includes('outbox')) {
    filters.folder = 'sent';
  } else if (lower.includes('trash') || lower.includes('bin')) {
    filters.folder = 'trash';
  } else if (lower.includes('draft')) {
    filters.folder = 'drafts';
  } else if (lower.includes('spam') || lower.includes('junk')) {
    filters.folder = 'spam';
  } else {
    filters.folder = 'inbox';
  }

  // Date range detection: "last X days", "this week", "today"
  const now = new Date();
  
  const lastDaysMatch = lower.match(/(?:last|past)\s+(\d+)\s+days?/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1], 10);
    const startDate = subDays(now, days);
    filters.startDate = format(startDate, 'yyyy-MM-dd');
  } else if (lower.includes('this week')) {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    filters.startDate = format(weekStart, 'yyyy-MM-dd');
  } else if (lower.includes('today')) {
    filters.startDate = format(now, 'yyyy-MM-dd');
  }

  // Sort direction detection: earliest/oldest vs latest/newest/recent
  if (
    lower.includes('earliest') ||
    lower.includes('early') ||
    lower.includes('oldest') ||
    /\bold\b/.test(lower)
  ) {
    filters.sort = 'oldest';
  } else if (
    lower.includes('latest') ||
    lower.includes('newest') ||
    lower.includes('recent')
  ) {
    filters.sort = 'newest';
  }

  // Attachment filter detection
  if (
    lower.includes('attachment') ||
    lower.includes('attachments') ||
    lower.includes('with attachment') ||
    lower.includes('with attachments')
  ) {
    filters.hasAttachment = true;
  }

  // Sender extraction: "from sender@example.com"
  const fromMatch = lower.match(/from\s+([a-zA-Z0-9._%+-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?|[a-zA-Z]+)/);
  if (fromMatch) {
    filters.from = fromMatch[1];
  }

  // Extract pure search keywords excluding filler phrases and generic action keywords
  let cleanQuery = queryStr
    .replace(/(?:show|find|get|display|list|search)\s+(?:me\s+)?/gi, '')
    .replace(/emails?\s+(?:from|about|with|in|to|by|for)\s*/gi, ' ')
    .replace(/(?:messages?|mail)\s+(?:from|about|with|in|to|by|for)\s*/gi, ' ')
    .replace(/(?:from\s+[^\s]+)/gi, '')
    .replace(/(?:last|past)\s+\d+\s+days?/gi, '')
    .replace(/this\s+week/gi, '')
    .replace(/unread/gi, '')
    .replace(/starred/gi, '')
    .replace(/flagged/gi, '')
    .replace(/(?:the\s+)?(?:latest|earliest|newest|recent|oldest|early|old|selected|my|important|attachments?|sender|subject)/gi, '')
    .replace(/\b(?:emails?|messages?|mail)\b/gi, '')
    .trim();

  if (cleanQuery.length > 0 && !cleanQuery.includes('email')) {
    filters.query = cleanQuery;
  }

  return filters;
}

export function buildGmailQueryString(filters: EmailFilters): string {
  const parts: string[] = [];

  if (filters.unreadOnly) {
    parts.push('is:unread');
  }
  if (filters.starredOnly || filters.folder === 'starred') {
    parts.push('is:starred');
  }
  if (filters.hasAttachment) {
    parts.push('has:attachment');
  }

  if (filters.folder === 'sent') {
    parts.push('in:sent');
  } else if (filters.folder === 'trash') {
    parts.push('in:trash');
  } else if (filters.folder === 'drafts') {
    parts.push('in:drafts');
  } else if (filters.folder === 'spam') {
    parts.push('in:spam');
  } else if (filters.folder === 'inbox') {
    parts.push('in:inbox');
  }

  if (filters.from) {
    parts.push(`from:${filters.from}`);
  }
  if (filters.to) {
    parts.push(`to:${filters.to}`);
  }
  if (filters.startDate) {
    parts.push(`after:${filters.startDate.replace(/-/g, '/')}`);
  }
  if (filters.endDate) {
    parts.push(`before:${filters.endDate.replace(/-/g, '/')}`);
  }
  if (filters.query) {
    parts.push(filters.query);
  }

  return parts.join(' ');
}
