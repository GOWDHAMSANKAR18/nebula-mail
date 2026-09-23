import { describe, it, expect } from 'vitest';
import { processAssistantRequest } from '../lib/ai/assistantEngine';
import { parseNaturalLanguageQuery } from '../lib/gmail/parser';
import { DemoMailProvider } from '../lib/gmail/demoProvider';

describe('AI Chat & Nebula Copilot Generic Recommendation Test Suite', () => {
  it('1. Reply to selected email without active email returns clear prompt to open email first', async () => {
    const res = await processAssistantRequest(
      'Reply to the selected email',
      [],
      { currentView: 'inbox', currentFilters: { folder: 'inbox' }, isComposeOpen: false, selectedMessageIds: [] }
    );
    expect(res.message.content).toContain('Please open an email before using this action.');
    expect(res.toolCalls).toHaveLength(0);
  });

  it('2. Forward selected email without active email returns clear prompt to open email first', async () => {
    const res = await processAssistantRequest(
      'Forward the selected email',
      [],
      { currentView: 'inbox', currentFilters: { folder: 'inbox' }, isComposeOpen: false, selectedMessageIds: [] }
    );
    expect(res.message.content).toContain('Please open an email before using this action.');
    expect(res.toolCalls).toHaveLength(0);
  });

  it('3. Summarize selected email without active email returns clear prompt to open email first', async () => {
    const res = await processAssistantRequest(
      'Summarize the selected email',
      [],
      { currentView: 'inbox', currentFilters: { folder: 'inbox' }, isComposeOpen: false, selectedMessageIds: [] }
    );
    expect(res.message.content).toContain('Please open an email before using this action.');
  });

  it('4. Reply to selected email WITH active email context uses actual email ID from context', async () => {
    const res = await processAssistantRequest(
      'Reply to the selected email',
      [],
      {
        currentView: 'email',
        currentEmailId: 'msg-real-999',
        currentFilters: { folder: 'inbox' },
        isComposeOpen: false,
        selectedMessageIds: [],
        currentEmail: {
          id: 'msg-real-999',
          threadId: 't-real-999',
          from: { name: 'Real Sender', email: 'realsender@example.com' },
          to: [{ email: 'me@example.com' }],
          subject: 'Project Architecture',
          snippet: 'Updates',
          bodyHtml: 'Updates',
          bodyText: 'Updates',
          date: '2026-09-24T00:00:00Z',
          timestamp: 1727136000000,
          isRead: true,
          folder: 'inbox',
        },
      }
    );
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].name).toBe('replyToEmail');
    expect(res.toolCalls[0].args.messageId).toBe('msg-real-999');
    expect(res.message.content).toContain('Real Sender');
  });

  it('5. "Create an email" recommendation opens compose with empty target fields', async () => {
    const res = await processAssistantRequest(
      'Create an email',
      [],
      { currentView: 'inbox', currentFilters: { folder: 'inbox' }, isComposeOpen: false, selectedMessageIds: [] }
    );
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].name).toBe('openCompose');
    expect(res.toolCalls[0].args.to).toBe('');
  });

  it('6. "Get early emails" / "Get the earliest emails" parses sort: "oldest"', () => {
    const f1 = parseNaturalLanguageQuery('Get early emails');
    expect(f1.folder).toBe('inbox');
    expect(f1.sort).toBe('oldest');

    const f2 = parseNaturalLanguageQuery('Show my earliest emails');
    expect(f2.folder).toBe('inbox');
    expect(f2.sort).toBe('oldest');

    const f3 = parseNaturalLanguageQuery('Find the oldest emails');
    expect(f3.folder).toBe('inbox');
    expect(f3.sort).toBe('oldest');
  });

  it('7. "Get latest emails" / "Show recent emails" parses sort: "newest"', () => {
    const f1 = parseNaturalLanguageQuery('Get latest emails');
    expect(f1.folder).toBe('inbox');
    expect(f1.sort).toBe('newest');

    const f2 = parseNaturalLanguageQuery('Show recent emails');
    expect(f2.folder).toBe('inbox');
    expect(f2.sort).toBe('newest');
  });

  it('8. "Get unread emails" parses unreadOnly: true', () => {
    const f = parseNaturalLanguageQuery('Get unread emails');
    expect(f.unreadOnly).toBe(true);
  });

  it('9. "Find emails with attachments" parses hasAttachment: true', () => {
    const f = parseNaturalLanguageQuery('Find emails with attachments');
    expect(f.hasAttachment).toBe(true);
  });

  it('10. User explicit input with real name "Get the earliest emails from David" combines sender + sort', () => {
    const f = parseNaturalLanguageQuery('Get the earliest emails from David');
    expect(f.folder).toBe('inbox');
    expect(f.from).toBe('david');
    expect(f.sort).toBe('oldest');
  });

  it('11. MailProvider listMessages with sort="oldest" returns messages sorted ascending by date (oldest first)', async () => {
    const provider = new DemoMailProvider();
    const res = await provider.listMessages({ sort: 'oldest', folder: 'inbox' });
    expect(res.messages.length).toBeGreaterThan(1);
    for (let i = 0; i < res.messages.length - 1; i++) {
      expect(res.messages[i].timestamp).toBeLessThanOrEqual(res.messages[i + 1].timestamp);
    }
  });

  it('12. MailProvider listMessages with sort="newest" returns messages sorted descending by date (newest first)', async () => {
    const provider = new DemoMailProvider();
    const res = await provider.listMessages({ sort: 'newest', folder: 'inbox' });
    expect(res.messages.length).toBeGreaterThan(1);
    for (let i = 0; i < res.messages.length - 1; i++) {
      expect(res.messages[i].timestamp).toBeGreaterThanOrEqual(res.messages[i + 1].timestamp);
    }
  });
});
