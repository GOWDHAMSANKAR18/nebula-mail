import { z } from 'zod';

export const SearchEmailsSchema = z.object({
  query: z.string().optional().describe('Free text keywords or subject query'),
  from: z.string().optional().describe('Sender email or name'),
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
  unreadOnly: z.boolean().optional().describe('Filter unread messages only'),
  starredOnly: z.boolean().optional().describe('Filter starred messages only'),
  hasAttachment: z.boolean().optional().describe('Filter messages with attachments only'),
  folder: z.enum(['inbox', 'sent', 'starred', 'trash', 'drafts', 'spam']).optional().describe('Folder filter'),
  sort: z.enum(['newest', 'oldest']).optional().describe('Sort order: "oldest" for earliest/oldest first, "newest" for recent/latest first'),
});

export const OpenEmailSchema = z.object({
  messageId: z.string().describe('The message ID of the email to open and view'),
});

export const OpenComposeSchema = z.object({
  to: z.string().optional().describe('Recipient email address'),
  subject: z.string().optional().describe('Email subject line'),
  body: z.string().optional().describe('Email body text'),
});

export const FillComposeSchema = z.object({
  to: z.string().optional().describe('Recipient email address'),
  subject: z.string().optional().describe('Email subject line'),
  body: z.string().optional().describe('Email body text'),
});

export const SendEmailSchema = z.object({
  to: z.string().describe('Recipient email address'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body text'),
  threadId: z.string().optional().describe('Thread ID if part of conversation'),
});

export const ReplyToEmailSchema = z.object({
  messageId: z.string().optional().describe('The email message ID to reply to. Defaults to current active email.'),
  body: z.string().optional().describe('The body text of the reply'),
});

export const ForwardEmailSchema = z.object({
  messageId: z.string().optional().describe('The email message ID to forward. Defaults to current active email.'),
  to: z.string().optional().describe('The recipient email address to forward to.'),
  body: z.string().optional().describe('Additional body text to include with forward.'),
});

export const ApplyFilterSchema = z.object({
  folder: z.enum(['inbox', 'sent', 'starred', 'trash', 'drafts', 'spam']).optional(),
  unreadOnly: z.boolean().optional(),
  starredOnly: z.boolean().optional(),
});

export const NavigateToSchema = z.object({
  view: z.enum(['inbox', 'sent', 'starred', 'trash', 'drafts', 'spam', 'compose']),
});

export const AssistantToolsMap = {
  searchEmails: SearchEmailsSchema,
  openEmail: OpenEmailSchema,
  openCompose: OpenComposeSchema,
  fillCompose: FillComposeSchema,
  sendEmail: SendEmailSchema,
  replyToEmail: ReplyToEmailSchema,
  forwardEmail: ForwardEmailSchema,
  applyFilter: ApplyFilterSchema,
  navigateTo: NavigateToSchema,
};
