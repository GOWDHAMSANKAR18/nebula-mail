import { describe, it, expect } from 'vitest';
import {
  SearchEmailsSchema,
  OpenEmailSchema,
  OpenComposeSchema,
  SendEmailSchema,
  ReplyToEmailSchema,
} from '../lib/ai/schemas';

describe('AI Assistant Tool Zod Validation Schemas', () => {
  it('validates searchEmails arguments', () => {
    const valid = SearchEmailsSchema.parse({
      from: 'david@nebula.io',
      unreadOnly: true,
      startDate: '2026-09-01',
    });
    expect(valid.from).toBe('david@nebula.io');
    expect(valid.unreadOnly).toBe(true);
  });

  it('validates openEmail arguments', () => {
    const valid = OpenEmailSchema.parse({ messageId: 'msg-101' });
    expect(valid.messageId).toBe('msg-101');
    expect(() => OpenEmailSchema.parse({})).toThrow();
  });

  it('validates sendEmail arguments requiring recipient, subject, body', () => {
    const valid = SendEmailSchema.parse({
      to: 'john@example.com',
      subject: 'Meeting Tomorrow',
      body: "Let's meet at 3pm",
    });
    expect(valid.to).toBe('john@example.com');
    expect(() => SendEmailSchema.parse({ to: 'john@example.com' })).toThrow();
  });

  it('validates replyToEmail arguments', () => {
    const valid = ReplyToEmailSchema.parse({
      messageId: 'msg-102',
      body: 'I approve the roadmap',
    });
    expect(valid.messageId).toBe('msg-102');
  });
});
