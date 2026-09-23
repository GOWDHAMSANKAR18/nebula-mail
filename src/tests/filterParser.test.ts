import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageQuery, buildGmailQueryString } from '../lib/gmail/parser';

describe('Natural Language Email Query Parser', () => {
  it('parses "unread emails from Sarah"', () => {
    const filters = parseNaturalLanguageQuery('unread emails from Sarah');
    expect(filters.unreadOnly).toBe(true);
    expect(filters.from).toBe('sarah');
  });

  it('parses "emails from the last 10 days"', () => {
    const filters = parseNaturalLanguageQuery('emails from the last 10 days');
    expect(filters.startDate).toBeDefined();
    // Verify date is 10 days ago format YYYY-MM-DD
    expect(filters.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('parses "this week"', () => {
    const filters = parseNaturalLanguageQuery('show emails from this week');
    expect(filters.startDate).toBeDefined();
    expect(filters.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('builds Gmail query string correctly', () => {
    const qStr = buildGmailQueryString({
      unreadOnly: true,
      from: 'sarah@nebula.io',
      startDate: '2026-09-10',
      folder: 'inbox',
    });
    expect(qStr).toContain('is:unread');
    expect(qStr).toContain('from:sarah@nebula.io');
    expect(qStr).toContain('after:2026/09/10');
    expect(qStr).toContain('in:inbox');
  });
});
