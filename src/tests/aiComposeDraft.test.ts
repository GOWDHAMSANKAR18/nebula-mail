import { describe, it, expect } from 'vitest';
import { generateNewEmail } from '../lib/ai/aiService';
import { DemoMailProvider } from '../lib/gmail/demoProvider';

describe('AI Email Compose & Gmail Draft saving', () => {
  it('generateNewEmail generates subject and body for custom instruction', async () => {
    const result = await generateNewEmail(
      'custom',
      'Please prepare a draft email to my project team about tomorrow’s meeting, including the meeting time, agenda, and a request to share any pending updates before the meeting.'
    );

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it('DemoMailProvider.saveDraft saves draft cleanly', async () => {
    const provider = new DemoMailProvider();
    const result = await provider.saveDraft({
      to: 'team@nebula.io',
      subject: 'Tomorrow Meeting Agenda',
      body: 'Hi Team,\n\nPlease see the agenda for tomorrow...',
    });

    expect(result.success).toBe(true);
    expect(result.draftId).toBeDefined();
  });
});
