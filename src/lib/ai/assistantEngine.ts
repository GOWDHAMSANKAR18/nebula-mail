import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssistantMessage, AppContextState, AssistantToolCall } from '@/types/assistant';
import { AIProfile } from '@/types/email';
import { formatContextForLLM } from './context';
import { parseNaturalLanguageQuery } from '../gmail/parser';
import { AssistantToolsMap } from './schemas';
import { getProfileInstruction } from './profiles';

export interface AssistantProcessResult {
  message: AssistantMessage;
  toolCalls: AssistantToolCall[];
}

const MAX_TOOL_CALLS_PER_REQUEST = 10;

export async function processAssistantRequest(
  userPrompt: string,
  history: AssistantMessage[],
  context: AppContextState,
  profile?: AIProfile | string
): Promise<AssistantProcessResult> {
  const selectedProfile = profile || context.selectedProfile || 'professional';
  const profileRules = getProfileInstruction(selectedProfile);

  console.log(`[Assistant Engine Metadata] profile: ${selectedProfile} | provider: ${process.env.AI_PROVIDER || 'gemini'}`);

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const systemPrompt = `You are Nebula Copilot, an AI UI Assistant for an email application.
The user is instructing you to perform actions on the mail client interface.

IMPORTANT RULES:
1. You DO NOT merely describe steps to the user. You MUST trigger structured tool calls that control the UI!
2. Available tools:
   - searchEmails: { query?, from?, startDate?, endDate?, unreadOnly?, starredOnly?, hasAttachment?, folder?, sort?: 'newest'|'oldest' }
   - openEmail: { messageId }
   - openCompose: { to?, subject?, body? }
   - fillCompose: { to?, subject?, body? }
   - sendEmail: { to, subject, body } (Note: sendEmail requires human confirmation!)
   - replyToEmail: { messageId?, body? }
   - forwardEmail: { messageId?, to?, body? }
   - applyFilter: { folder?, unreadOnly?, starredOnly? }
   - navigateTo: { view: 'inbox'|'sent'|'starred'|'trash'|'compose' }

GENERIC ACTION & SAFETY RULE:
Generate generic email-management actions only. Never insert example person names, email addresses, sender identities, recipient identities, or fake Gmail data into suggested actions, tool calls, or generated messages unless explicitly supplied by the user or retrieved from actual Gmail data. Prohibit fabricated sender names, recipient names, email addresses, message IDs, or thread IDs.

CONTEXT DATA:
${formatContextForLLM(context)}

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

OUTPUT FORMAT:
Return a JSON object with:
{
  "thought": "Your reasoning process",
  "text": "User-facing message explaining what action you took in the UI",
  "toolCalls": [
    { "name": "toolName", "args": { ... } }
  ]
}`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: 'application/json' },
      });

      const chat = model.startChat({});

      const response = await chat.sendMessage(userPrompt);
      const rawText = response.response.text();
      const parsed = JSON.parse(rawText);

      const rawCalls = (parsed.toolCalls || []).slice(0, MAX_TOOL_CALLS_PER_REQUEST);

      const validatedToolCalls: AssistantToolCall[] = rawCalls.map(
        (tc: any, idx: number) => {
          const toolName = tc.name as keyof typeof AssistantToolsMap;
          const schema = AssistantToolsMap[toolName];
          
          let validatedArgs = tc.args;
          let validationError: string | undefined = undefined;

          if (schema) {
            const parseResult = schema.safeParse(tc.args);
            if (parseResult.success) {
              validatedArgs = parseResult.data;
            } else {
              validationError = `Invalid arguments for ${toolName}: ${parseResult.error.message}`;
            }
          }

          const requiresConfirmation = toolName === 'sendEmail';

          return {
            id: `call-${Date.now()}-${idx}`,
            name: toolName,
            args: validatedArgs,
            status: validationError ? 'failed' : (requiresConfirmation ? 'requires_confirmation' : 'pending'),
            error: validationError,
          };
        }
      );

      const assistantMsg: AssistantMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: parsed.text || 'Executing requested UI action...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: validatedToolCalls,
      };

      return {
        message: assistantMsg,
        toolCalls: validatedToolCalls,
      };
    } catch (err: any) {
      console.warn('Gemini API call failed or key absent, using intelligent fallback rules:', err?.message);
    }
  }

  // Fallback Rule Engine (Zero-Config out-of-the-box local intelligence)
  return fallbackRuleEngine(userPrompt, context);
}

function fallbackRuleEngine(userPrompt: string, context: AppContextState): AssistantProcessResult {
  const lower = userPrompt.toLowerCase().trim();
  const toolCalls: AssistantToolCall[] = [];
  let responseText = '';
  let planSteps: { title: string; description?: string; status: 'pending' | 'executing' | 'completed' | 'cancelled' }[] | undefined = undefined;

  const activeEmailId = context.currentEmailId || context.currentEmail?.id;
  const hasActiveEmail = Boolean(activeEmailId || context.currentEmail);

  // Multi-step pattern: "Find unread emails this week, summarize them, and prepare a reply..."
  if ((lower.includes('find') || lower.includes('search')) && lower.includes('summarize') && (lower.includes('reply') || lower.includes('prepare'))) {
    const parsedFilters = parseNaturalLanguageQuery(userPrompt);

    toolCalls.push({
      id: `call-${Date.now()}-1`,
      name: 'searchEmails',
      args: parsedFilters,
      status: 'pending',
    });

    if (activeEmailId) {
      toolCalls.push({
        id: `call-${Date.now()}-2`,
        name: 'replyToEmail',
        args: {
          messageId: activeEmailId,
          body: 'Thank you for the update. I have reviewed the details and will proceed as requested.',
        },
        status: 'pending',
      });
    }

    planSteps = [
      { title: 'Search unread emails', description: `Filtering emails by query/sender criteria (${parsedFilters.from || 'specified sender'})`, status: 'pending' },
      { title: 'Review matching conversation', description: 'Inspecting top matching Gmail message thread', status: 'pending' },
      { title: 'Summarize key points', description: 'Extracting key topics, decisions, and action items', status: 'pending' },
      { title: 'Prepare reply draft', description: 'Generating proposed response for your review & approval', status: 'pending' },
    ];

    responseText = `Here is the multi-step execution plan to search, summarize, and prepare a reply:`;
  }
  // Generic Action: "Create an email", "Draft an email", "Compose an email"
  else if (
    (lower === 'create an email' || lower === 'draft an email' || lower === 'compose an email' || lower === 'create email' || lower === 'draft email') ||
    ((lower.includes('create') || lower.includes('draft') || lower.includes('compose')) && lower.includes('email') && !lower.includes('to ') && !lower.includes('from '))
  ) {
    toolCalls.push({
      id: `call-${Date.now()}-1`,
      name: 'openCompose',
      args: { to: '', subject: '', body: '' },
      status: 'pending',
    });
    responseText = 'I have opened the compose window.';
  }
  // Explicit Send Email ("Send an email to user@domain.com...")
  else if (lower.includes('send') && (lower.includes('email') || lower.includes('to'))) {
    const toMatch = lower.match(/(?:to|recipient)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                    userPrompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const subjectMatch = userPrompt.match(/subject\s+(?:is\s+)?["']?([^"'\n,]+)["']?/i) ||
                         userPrompt.match(/subject\s+([^\n,]+?)(?=\s+and\s+body|\s+body|$)/i);
    const bodyMatch = userPrompt.match(/body\s+(?:is\s+)?["']?([^"'\n]+)["']?/i) ||
                       userPrompt.match(/body\s+([^\n]+)/i);

    const to = toMatch ? toMatch[1] : '';
    const subject = subjectMatch ? subjectMatch[1].trim() : 'New Message';
    const body = bodyMatch ? bodyMatch[1].trim() : '';

    toolCalls.push({
      id: `call-${Date.now()}-1`,
      name: 'openCompose',
      args: { to, subject, body },
      status: 'pending',
    });

    toolCalls.push({
      id: `call-${Date.now()}-2`,
      name: 'sendEmail',
      args: { to, subject, body },
      status: 'requires_confirmation',
    });

    responseText = to
      ? `I have opened the compose window and populated the details for ${to}. Please confirm sending below.`
      : `I have opened the compose window. Please confirm sending below.`;
  }
  // Reply to Email Action ("Reply to the selected email", "Reply to this", "Reply saying...")
  else if (lower.includes('reply')) {
    if (!hasActiveEmail) {
      responseText = 'Please open an email before using this action.';
    } else {
      const bodyMatch = userPrompt.match(/(?:reply|saying)\s+["']?([^"'\n]+)["']?/i);
      const bodyText = bodyMatch ? bodyMatch[1] : '';

      toolCalls.push({
        id: `call-${Date.now()}-1`,
        name: 'replyToEmail',
        args: {
          messageId: activeEmailId,
          body: bodyText,
        },
        status: 'pending',
      });

      const senderName = context.currentEmail?.from?.name && !context.currentEmail.from.name.includes('@')
        ? context.currentEmail.from.name.trim()
        : null;

      responseText = senderName
        ? `Opened reply composer for email from ${senderName}.`
        : `Opened reply composer for the selected email.`;
    }
  }
  // Forward Email Action ("Forward the selected email", "Forward")
  else if (lower.includes('forward')) {
    if (!hasActiveEmail) {
      responseText = 'Please open an email before using this action.';
    } else {
      toolCalls.push({
        id: `call-${Date.now()}-1`,
        name: 'forwardEmail',
        args: {
          messageId: activeEmailId,
        },
        status: 'pending',
      });
      responseText = `Opened forward composer for the selected email.`;
    }
  }
  // Summarize Email Action ("Summarize the selected email", "Summarize recent emails")
  else if (lower.includes('summarize')) {
    if (lower.includes('recent')) {
      toolCalls.push({
        id: `call-${Date.now()}-1`,
        name: 'applyFilter',
        args: { folder: 'inbox' },
        status: 'pending',
      });
      responseText = `Summarizing recent emails in your inbox...`;
    } else {
      if (!hasActiveEmail) {
        responseText = 'Please open an email before using this action.';
      } else {
        responseText = `Summary of selected email: ${context.currentEmail?.snippet || context.currentEmail?.subject || 'Selected email thread.'}`;
      }
    }
  }
  // Show / Search Emails Action ("Get early emails", "Get the earliest emails", "Get latest emails", etc.)
  else if (
    lower.includes('show') ||
    lower.includes('find') ||
    lower.includes('search') ||
    lower.includes('unread') ||
    lower.includes('get') ||
    lower.includes('list') ||
    lower.includes('display') ||
    lower.includes('earliest') ||
    lower.includes('early') ||
    lower.includes('oldest') ||
    lower.includes('latest') ||
    lower.includes('recent') ||
    lower.includes('newest')
  ) {
    const parsedFilters = parseNaturalLanguageQuery(userPrompt);

    toolCalls.push({
      id: `call-${Date.now()}-1`,
      name: 'searchEmails',
      args: parsedFilters,
      status: 'pending',
    });

    if (parsedFilters.sort === 'oldest') {
      responseText = `Retrieved inbox emails and sorted them from oldest to newest.`;
    } else if (parsedFilters.sort === 'newest') {
      responseText = `Retrieved inbox emails sorted by newest first.`;
    } else if (parsedFilters.unreadOnly) {
      responseText = `Retrieved unread emails from your inbox.`;
    } else if (parsedFilters.hasAttachment) {
      responseText = `Retrieved emails containing attachments.`;
    } else {
      responseText = `Applied email search filter to UI inbox.`;
    }
  }
  // Pattern 4: Open email ("Open email")
  else if (lower.includes('open')) {
    if (hasActiveEmail) {
      toolCalls.push({
        id: `call-${Date.now()}-1`,
        name: 'openEmail',
        args: { messageId: activeEmailId },
        status: 'pending',
      });
      responseText = `Navigating to active email message...`;
    } else {
      const searchTerms = userPrompt.replace(/^(?:open|show)\s+(?:the\s+)?(?:email\s+)?(?:from\s+)?/i, '').trim();
      const query = searchTerms || userPrompt;
      toolCalls.push({
        id: `call-${Date.now()}-1`,
        name: 'searchEmails',
        args: { query },
        status: 'pending',
      });
      responseText = `Searching emails for "${query}"...`;
    }
  }
  // Default search fallback
  else {
    toolCalls.push({
      id: `call-${Date.now()}-1`,
      name: 'searchEmails',
      args: { query: userPrompt },
      status: 'pending',
    });
    responseText = `Searching emails for "${userPrompt}"...`;
  }

  // Cap fallback tool calls to MAX_TOOL_CALLS_PER_REQUEST
  const cappedCalls = toolCalls.slice(0, MAX_TOOL_CALLS_PER_REQUEST);

  const assistantMsg: AssistantMessage = {
    id: `msg-ai-${Date.now()}`,
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    toolCalls: cappedCalls,
    planSteps,
  };

  return {
    message: assistantMsg,
    toolCalls: cappedCalls,
  };
}
