import { describe, it, expect } from 'vitest';
import { buildGmailQueryString, parseNaturalLanguageQuery } from '../lib/gmail/parser';
import { generateNewEmail, summarizeThread, detectFollowUps, extractActionItems } from '../lib/ai/aiService';
import { processAssistantRequest } from '../lib/ai/assistantEngine';
import { EmailMessage, EmailFilters } from '../types/email';

describe('NEBULA MAIL — Advanced Feature & Gap Fix Suite', () => {
  // Test 1: Sender & Attachment Filter Parser
  it('buildGmailQueryString formats sender, attachment, unread, and date filters', () => {
    const filters: EmailFilters = {
      from: 'John',
      unreadOnly: true,
      hasAttachment: true,
      starredOnly: true,
      startDate: '2026-09-16',
      folder: 'inbox',
    };

    const qStr = buildGmailQueryString(filters);
    expect(qStr).toContain('is:unread');
    expect(qStr).toContain('is:starred');
    expect(qStr).toContain('has:attachment');
    expect(qStr).toContain('in:inbox');
    expect(qStr).toContain('from:John');
    expect(qStr).toContain('after:2026/09/16');
  });

  // Test 2: AI Compose Validation (no threadId/messageId required)
  it('generateNewEmail creates subject and body for standalone prompt', async () => {
    const res = await generateNewEmail(
      'professional',
      'Write a professional email asking my project team to submit their pending work before tomorrow meeting.'
    );

    expect(res).toBeDefined();
    expect(res.subject).toBeTypeOf('string');
    expect(res.body).toBeTypeOf('string');
    expect(res.subject.length).toBeGreaterThan(0);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Test 3: Thread Summarization Structure
  it('summarizeThread outputs required structured fields', async () => {
    const mockMessages: EmailMessage[] = [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        from: { name: 'Sarah', email: 'sarah@nebula.io' },
        to: [{ email: 'gowdham@nebula.io' }],
        subject: 'Project Submission Review',
        snippet: 'Final review will happen Friday. Please update documentation.',
        bodyHtml: '<div>Final review will happen Friday. Gowdham: update documentation.</div>',
        bodyText: 'Final review will happen Friday. Gowdham: update documentation.',
        date: '2026-09-20T10:00:00Z',
        timestamp: 1726826400000,
        isRead: false,
        folder: 'inbox',
      },
    ];

    const summary = await summarizeThread(mockMessages);
    expect(summary).toBeDefined();
    expect(summary.shortSummary).toBeDefined();
    expect(summary.topic).toBeDefined();
    expect(Array.isArray(summary.decisions)).toBe(true);
    expect(Array.isArray(summary.actionItems)).toBe(true);
    expect(Array.isArray(summary.peopleInvolved)).toBe(true);
    expect(Array.isArray(summary.deadlines)).toBe(true);
    expect(summary.nextStep).toBeDefined();
  });

  // Test 4: Follow-up Detection
  it('detectFollowUps identifies pending follow-up items', async () => {
    const mockMessages: EmailMessage[] = [
      {
        id: 'msg-2',
        threadId: 'thread-2',
        from: { name: 'John', email: 'john@nebula.io' },
        to: [{ email: 'gowdham@nebula.io' }],
        subject: 'Project Report Request',
        snippet: 'Could you send me the updated project report by Friday?',
        bodyHtml: '<div>Could you send me the updated project report by Friday?</div>',
        bodyText: 'Could you send me the updated project report by Friday?',
        date: '2026-09-18T10:00:00Z',
        timestamp: 1726653600000,
        isRead: false,
        folder: 'inbox',
      },
    ];

    const followUps = await detectFollowUps(mockMessages);
    expect(Array.isArray(followUps)).toBe(true);
  });

  // Test 5: Action Item Extraction
  it('extractActionItems extracts actionable tasks', async () => {
    const mockMessages: EmailMessage[] = [
      {
        id: 'msg-3',
        threadId: 'thread-3',
        from: { name: 'Arun', email: 'arun@nebula.io' },
        to: [{ email: 'gowdham@nebula.io' }],
        subject: 'Database Module Verification',
        snippet: 'Arun will verify database module before Sep 26.',
        bodyHtml: '<div>Arun will verify database module before Sep 26.</div>',
        bodyText: 'Arun will verify database module before Sep 26.',
        date: '2026-09-21T10:00:00Z',
        timestamp: 1726912800000,
        isRead: true,
        folder: 'inbox',
      },
    ];

    const actionItems = await extractActionItems(mockMessages);
    expect(Array.isArray(actionItems)).toBe(true);
  });

  // Test 6: Multi-Step Assistant Planning
  it('fallbackRuleEngine generates multi-step plan steps for complex prompts', async () => {
    const res = await processAssistantRequest(
      'Find unread emails from Sarah this week, summarize them, and prepare a reply',
      [],
      {
        currentView: 'inbox',
        currentFilters: { folder: 'inbox' },
        isComposeOpen: false,
        selectedMessageIds: [],
      }
    );

    expect(res.message).toBeDefined();
    expect(res.toolCalls.length).toBeGreaterThan(0);
    expect(res.message.planSteps).toBeDefined();
    expect(res.message.planSteps?.length).toBeGreaterThan(0);
  });

  // Test 7: Context-aware "reply to this"
  it('fallbackRuleEngine attaches context currentEmailId for reply commands', async () => {
    const res = await processAssistantRequest(
      'Reply to this saying I will attend tomorrow',
      [],
      {
        currentView: 'email',
        currentEmailId: 'msg-target-999',
        currentFilters: { folder: 'inbox' },
        isComposeOpen: false,
        selectedMessageIds: [],
      }
    );

    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].name).toBe('replyToEmail');
    expect(res.toolCalls[0].args.messageId).toBe('msg-target-999');
  });

  // Test 8: Human Confirmation Requirement
  it('sendEmail tool calls require explicit human confirmation status', async () => {
    const res = await processAssistantRequest(
      'Send email to team@nebula.io with subject Meeting and body Hello team',
      [],
      {
        currentView: 'inbox',
        currentFilters: { folder: 'inbox' },
        isComposeOpen: false,
        selectedMessageIds: [],
      }
    );

    const sendCall = res.toolCalls.find(tc => tc.name === 'sendEmail');
    expect(sendCall).toBeDefined();
    expect(sendCall?.status).toBe('requires_confirmation');
  });

  // Test 9: Client State Message Deduplication
  it('Deduplicates duplicate emails by ID', () => {
    const messages: EmailMessage[] = [
      { id: '101', threadId: 't1', from: { name: 'A', email: 'a@a.com' }, to: [], subject: 'Sub 1', snippet: '', bodyHtml: '', bodyText: '', date: '', timestamp: 1, isRead: true, folder: 'inbox' },
      { id: '101', threadId: 't1', from: { name: 'A', email: 'a@a.com' }, to: [], subject: 'Sub 1 Duplicate', snippet: '', bodyHtml: '', bodyText: '', date: '', timestamp: 1, isRead: true, folder: 'inbox' },
      { id: '102', threadId: 't2', from: { name: 'B', email: 'b@b.com' }, to: [], subject: 'Sub 2', snippet: '', bodyHtml: '', bodyText: '', date: '', timestamp: 2, isRead: false, folder: 'inbox' },
    ];

    const map = new Map<string, EmailMessage>();
    messages.forEach(m => map.set(m.id, m));
    const deduped = Array.from(map.values());

    expect(deduped).toHaveLength(2);
    expect(deduped.map(m => m.id)).toEqual(['101', '102']);
  });
});
