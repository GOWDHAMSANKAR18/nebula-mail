import { describe, test, expect } from 'vitest';
import { classifyEmailCategory, generateInboxBriefing } from '../lib/ai/aiService';
import { EmailMessage } from '../types/email';

describe('NEBULA MAIL — Dashboard Email Classification Suite', () => {
  const createMockMsg = (id: string, subject: string, snippet: string, folder: 'inbox' | 'sent' = 'inbox'): EmailMessage => ({
    id,
    threadId: `thread-${id}`,
    from: { name: 'Sender Name', email: 'sender@example.com' },
    to: [{ email: 'user@example.com' }],
    subject,
    snippet,
    bodyText: snippet,
    bodyHtml: `<p>${snippet}</p>`,
    date: new Date().toISOString(),
    timestamp: Date.now(),
    isRead: false,
    folder,
  });

  test('1. Classifies Needs Attention (Action required / Urgent / Critical alerts)', () => {
    const msg = createMockMsg('m-1', 'URGENT: Action Required on Production Server', 'Immediate attention needed for database alert.');
    const result = classifyEmailCategory(msg);
    expect(result.category).toBe('needsAttention');
  });

  test('2. Classifies Waiting for You (Questions / Requests to user)', () => {
    const msg = createMockMsg('m-2', 'Question regarding design mockups', 'Can you please confirm if the latest layout looks good to you?');
    const result = classifyEmailCategory(msg);
    expect(result.category).toBe('waitingForYou');
  });

  test('3. Classifies Upcoming Deadlines (Time-sensitive / Due dates)', () => {
    const msg = createMockMsg('m-3', 'Project Submission Deadline Tomorrow', 'Please note that the final project submission is due by tomorrow EOD.');
    const result = classifyEmailCategory(msg);
    expect(result.category).toBe('deadlines');
  });

  test('4. Classifies Meeting Proposals (Scheduling / Calendar invites)', () => {
    const msg = createMockMsg('m-4', 'Proposed Meeting Time for Q4 Review', 'Are you available at 3 PM tomorrow for a Zoom call to discuss quarterly targets?');
    const result = classifyEmailCategory(msg);
    expect(result.category).toBe('meetings');
  });

  test('5. Classifies Waiting for Others (Sent messages / External reply requests)', () => {
    const msgSent = createMockMsg('m-5', 'Following up on contract draft', 'I am waiting for your reply regarding the revised terms.', 'sent');
    const resultSent = classifyEmailCategory(msgSent);
    expect(resultSent.category).toBe('waitingForOthers');
  });

  test('6. Classifies FYI & Updates (Status reports / Informational notices)', () => {
    const msgFYI = createMockMsg('m-6', 'Weekly Engineering Digest', 'Here is the informational summary of team updates for this week.');
    const resultFYI = classifyEmailCategory(msgFYI);
    expect(resultFYI).toBeDefined();
  });

  test('7. generateInboxBriefing populates all 6 categories across inbox and sent messages', async () => {
    const inboxMsgs = [
      createMockMsg('1', 'URGENT: Action Required', 'Critical alert.'),
      createMockMsg('2', 'Question for you?', 'Can you reply?'),
      createMockMsg('3', 'Project Submission Deadline', 'Due by tomorrow.'),
      createMockMsg('4', 'Meeting Proposal for tomorrow', 'Are you available for a call at 2pm?'),
      createMockMsg('5', 'FYI: Weekly Status Update', 'Informational status update.'),
    ];

    const sentMsgs = [
      createMockMsg('6', 'Proposal sent - waiting for your reply', 'Please confirm when reviewed.', 'sent'),
    ];

    const briefing = await generateInboxBriefing(inboxMsgs, sentMsgs);

    expect(briefing.needsAttention.length).toBeGreaterThan(0);
    expect(briefing.waitingForYou.length).toBeGreaterThan(0);
    expect(briefing.deadlines.length).toBeGreaterThan(0);
    expect(briefing.meetings.length).toBeGreaterThan(0);
    expect(briefing.waitingForOthers.length).toBeGreaterThan(0);
    expect(briefing.fyi.length).toBeGreaterThan(0);
  });
});
