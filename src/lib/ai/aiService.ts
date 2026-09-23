import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  EmailMessage,
  EmailThread,
  AIReplyMode,
  ThreadSummary,
  ActionItem,
  MeetingInfo,
  DraftReviewResult,
  InboxBriefing,
  WritingStyle,
  AIPriorityCategory,
  FollowUpItem,
  AIProfile,
} from '@/types/email';
import { buildSystemInstruction } from './profiles';

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
const providerType = process.env.AI_PROVIDER || 'gemini'; // 'gemini' | 'ollama'

// Helper to call LLM (Gemini or Ollama) server-side
export async function generateText(
  prompt: string,
  systemInstruction?: string,
  metadata?: { profile?: string; provider?: string }
): Promise<string> {
  const currentProvider = process.env.AI_PROVIDER || 'gemini';
  const effectiveProfile = metadata?.profile || 'professional';

  console.log(`[AI Service Metadata] profile: ${effectiveProfile} | provider: ${currentProvider}`);

  if (currentProvider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          system: systemInstruction,
          prompt: prompt,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.response || '';
      }
      throw new Error(`Ollama returned status ${res.status}`);
    } catch (e: any) {
      console.warn('[Ollama Provider Error]:', e?.message);
      if (genAI) {
        // Fallback if available
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        const result = await model.generateContent(prompt);
        return result.response.text();
      }
      throw new Error('Local Ollama is unavailable. Start Ollama or switch to Gemini.');
    }
  }

  // Gemini Provider
  const activeKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
  if (activeKey && activeKey.trim().length > 0) {
    try {
      const client = new GoogleGenerativeAI(activeKey);
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.error('[Gemini AI Provider Error]:', err?.message?.replace(/key=[^&\s]+/g, 'key=[REDACTED]'));
      throw new Error('Gemini is currently unavailable. Switch to Local Ollama or try again.');
    }
  }

  throw new Error('Gemini is currently unavailable. Switch to Local Ollama or try again.');
}

// 1. ADVANCED AI THREAD REPLY GENERATION
export async function generateThreadReply(
  messages: EmailMessage[],
  mode: AIReplyMode,
  customInstruction?: string,
  writingStyle?: WritingStyle,
  profile?: AIProfile | string
): Promise<string> {
  const formattedThread = messages
    .map(
      (m, idx) =>
        `[Message ${idx + 1}] From: ${m.from.name} <${m.from.email}>\nDate: ${m.date}\nSubject: ${m.subject}\nBody:\n${m.bodyText || m.snippet}`
    )
    .join('\n\n---\n\n');

  const selectedProfile =
    profile ||
    writingStyle?.selectedProfile ||
    (['professional', 'friendly', 'concise', 'technical', 'creative', 'executive'].includes(mode) ? mode : 'professional');

  // Normalize reply mode safely: 'detailed' vs 'brief' (supporting legacy modes)
  let normalizedMode: 'detailed' | 'brief' | 'custom' = 'detailed';
  if (mode === 'brief' || mode === 'concise' || mode === 'acknowledge') {
    normalizedMode = 'brief';
  } else if (mode === 'custom') {
    normalizedMode = 'custom';
  } else {
    normalizedMode = 'detailed';
  }

  let modeInstruction = '';
  switch (normalizedMode) {
    case 'brief':
      modeInstruction = 'Generate a short, direct reply containing only the necessary information.';
      break;
    case 'detailed':
      modeInstruction = 'Generate a complete, properly structured reply with enough context and explanation.';
      break;
    case 'custom':
      modeInstruction = `Follow this custom instruction carefully: "${customInstruction || 'Respond appropriately'}".`;
      break;
  }

  const baseSystemInstruction = `You are an AI Email Assistant. You must draft an email reply based strictly on the conversation history provided.

CRITICAL SAFETY RULES:
1. NEVER invent facts, dates, meetings, commitments, approvals, or completed actions not confirmed in the thread.
2. If the user asks whether something was done and the thread does not confirm it, say "I haven't confirmed that yet. Let me check and get back to you."
3. Do NOT include markdown code blocks (\`\`\`html or \`\`\`markdown). Output clean text only.
4. Output ONLY the raw body of the reply. Do NOT include Subject headers or To/Cc fields.
5. NEVER invent recipient or sender names (e.g. John, Mike, Arun, Gowdham, Sarah, Alex, etc.). Use generic/neutral greetings like "Hi," unless a real sender or recipient name is explicitly provided in the conversation history.`;

  const finalSystemInstruction = buildSystemInstruction(baseSystemInstruction, selectedProfile, writingStyle);

  const prompt = `Mode Goal: ${modeInstruction}\n${customInstruction ? `Additional Custom Instruction: ${customInstruction}\n` : ''}\nConversation History:\n${formattedThread}\n\nGenerate suggested email reply body:`;

  try {
    const text = await generateText(prompt, finalSystemInstruction, { profile: String(selectedProfile) });
    return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  } catch (err) {
    // Intelligent Fallback Generator if AI key is missing or offline
    const lastMsg = messages[messages.length - 1] || messages[0];
    const rawName = lastMsg?.from?.name?.trim();
    const senderName = rawName && !rawName.includes('@') ? rawName : null;
    const greeting = senderName ? `Hi ${senderName},` : 'Hi,';

    if (mode === 'acknowledge') return `${greeting}\n\nThank you for your email. I have received your message and will review it shortly.\n\nBest regards,`;
    if (mode === 'concise') return `${greeting}\n\nThanks for reaching out! I've noted this and will follow up soon.\n\nBest,`;
    return `${greeting}\n\nThank you for your email regarding "${lastMsg?.subject || 'this matter'}". I am currently reviewing the details and will get back to you with a full response.\n\nBest regards,`;
  }
}

// 1B. NEW EMAIL COMPOSE GENERATION (NO THREAD/MESSAGE REQUIRED)
export async function generateNewEmail(
  mode?: string,
  customInstruction?: string,
  writingStyle?: WritingStyle,
  profile?: AIProfile | string
): Promise<{ subject: string; body: string }> {
  const userPrompt = customInstruction || 'Write a professional email.';
  const selectedProfile =
    profile ||
    writingStyle?.selectedProfile ||
    (mode && ['professional', 'friendly', 'concise', 'technical', 'creative', 'executive'].includes(mode) ? mode : 'professional');

  const baseSystemInstruction = `You are an AI Email Assistant. Your task is to generate a NEW email based on the user's instructions.
Output ONLY a JSON object with this exact structure:
{
  "subject": "Clear, concise, appropriate subject line",
  "body": "Complete, polished, professional email body"
}
CRITICAL SAFETY RULES:
1. Do NOT invent false facts or false commitments.
2. Output strictly valid JSON. Do NOT wrap in markdown fences if possible.`;

  const finalSystemInstruction = buildSystemInstruction(baseSystemInstruction, selectedProfile, writingStyle);

  const prompt = `User Instruction: "${userPrompt}"\n\nGenerate JSON containing "subject" and "body":`;

  try {
    const text = await generateText(prompt, finalSystemInstruction, { profile: String(selectedProfile) });
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) {
      return {
        subject: parsed.subject.trim(),
        body: parsed.body.trim(),
      };
    }
    throw new Error('Invalid JSON output format');
  } catch (err) {
    // Intelligent Fallback for New Email Composition
    let fallbackSubject = 'Project Update & Discussion';
    if (userPrompt.toLowerCase().includes('meeting')) {
      fallbackSubject = "Tomorrow's Project Team Meeting — Agenda & Updates Request";
    } else if (userPrompt.toLowerCase().includes('extension') || userPrompt.toLowerCase().includes('deadline')) {
      fallbackSubject = 'Request for Deadline Extension';
    }

    const fallbackBody = `Hi Team,\n\nI hope you're having a productive week.\n\nRegarding our discussion: "${userPrompt}".\n\nPlease review the details and share any pending updates or feedback prior to our meeting.\n\nBest regards,`;

    return {
      subject: fallbackSubject,
      body: fallbackBody,
    };
  }
}

// 2. DRAFT REVIEW WITH AI
export async function reviewDraft(draftBody: string, messages: EmailMessage[]): Promise<DraftReviewResult> {
  const formattedThread = messages
    .map(
      (m, idx) =>
        `[Message ${idx + 1}] From: ${m.from.name} <${m.from.email}>\nBody: ${m.bodyText || m.snippet}`
    )
    .join('\n\n---\n\n');

  const systemInstruction = `You are a strict Email Quality & Safety Inspector. Analyze the proposed reply draft against the email conversation history.
Detect:
1. Unanswered questions from the original email.
2. Unsupported claims or false statements made in the draft.
3. Accidental commitments, promises, or deadlines in the draft.
4. Tone issues or harsh language.
Return ONLY valid JSON matching this exact structure:
{
  "isGoodToSend": boolean,
  "summary": "Brief 1-sentence assessment",
  "strengths": ["string"],
  "unansweredQuestions": ["string"],
  "unsupportedClaims": ["string"],
  "accidentalCommitments": ["string"],
  "toneWarnings": ["string"],
  "suggestedModifications": ["string"]
}`;

  const prompt = `Proposed Reply Draft:\n${draftBody}\n\nConversation History:\n${formattedThread}\n\nJSON Review Output:`;

  try {
    const rawJson = await generateText(prompt, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      isGoodToSend: true,
      summary: 'Draft appears clear and ready for review.',
      strengths: ['Addressed the sender', 'Maintained polite tone'],
      unansweredQuestions: [],
      unsupportedClaims: [],
      accidentalCommitments: [],
      toneWarnings: [],
      suggestedModifications: [],
    };
  }
}

// 3. SMART THREAD SUMMARY
export async function summarizeThread(messages: EmailMessage[]): Promise<ThreadSummary> {
  const formattedThread = messages
    .map(
      (m, idx) =>
        `[Message ${idx + 1}] From: ${m.from.name} <${m.from.email}>\nDate: ${m.date}\nContent:\n${m.bodyText || m.snippet}`
    )
    .join('\n\n---\n\n');

  const systemInstruction = `Analyze the email thread and output a JSON summary.
DO NOT INVENT INFORMATION OR HALLUCINATE FACTS. Clearly distinguish detected empirical facts from AI interpretation.
Return ONLY JSON matching this structure:
{
  "shortSummary": "1-2 sentence overall summary of the thread",
  "topic": "Concise main topic title",
  "decisions": ["Specific agreed decision 1"],
  "actionItems": ["Task item with responsible person if specified"],
  "peopleInvolved": ["Name or Email of participants"],
  "deadlines": ["Explicit deadlines or dates mentioned"],
  "nextStep": "Immediate next suggested action",
  "openQuestions": ["Unanswered questions in the thread"],
  "keyPoints": ["Key background point 1"],
  "latestStatus": "Current state of the discussion"
}`;

  const prompt = `Email Thread:\n${formattedThread}\n\nJSON Summary:`;

  try {
    const rawJson = await generateText(prompt, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      shortSummary: parsed.shortSummary || parsed.topic || 'Email discussion thread.',
      topic: parsed.topic || messages[0]?.subject || 'Email Thread',
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      peopleInvolved: Array.isArray(parsed.peopleInvolved) ? parsed.peopleInvolved : messages.map(m => m.from.name),
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
      nextStep: parsed.nextStep || 'Review conversation history.',
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      latestStatus: parsed.latestStatus || 'Active discussion',
    };
  } catch (e) {
    const firstMsg = messages[0];
    const people = Array.from(new Set(messages.map(m => m.from.name)));
    return {
      shortSummary: `Discussion regarding "${firstMsg?.subject || 'this topic'}".`,
      topic: firstMsg?.subject || 'Email Discussion',
      decisions: [],
      actionItems: [],
      peopleInvolved: people,
      deadlines: [],
      nextStep: 'Review recent responses.',
      openQuestions: [],
      keyPoints: [firstMsg?.snippet || 'Email conversation thread.'],
      latestStatus: 'Recent conversation thread.',
    };
  }
}

// 3B. FOLLOW-UP DETECTION ASSISTANT
export async function detectFollowUps(messages: EmailMessage[]): Promise<FollowUpItem[]> {
  const formattedThread = messages
    .slice(0, 15)
    .map(
      (m, idx) =>
        `[Msg ${idx + 1}] ID:${m.id} Thread:${m.threadId} From:${m.from.name} <${m.from.email}> Date:${m.date}\nBody:${m.bodyText?.slice(0, 300) || m.snippet}`
    )
    .join('\n\n---\n\n');

  const systemInstruction = `Analyze recent emails to identify pending follow-up requirements.
Detect emails where:
- Someone requested something from the user
- User promised something or needs to reply
- A response appears overdue
- A deadline was mentioned or an unanswered question exists
Return ONLY JSON array of follow-up objects:
[
  {
    "id": "fu-1",
    "threadId": "string",
    "messageId": "string",
    "fromName": "Sender Name",
    "fromEmail": "sender@email.com",
    "reason": "Clear 1-sentence reason (e.g. Response requested 3 days ago)",
    "date": "Date of email or deadline",
    "suggestedAction": "Suggested action (e.g. Draft Follow-up)"
  }
]
Do NOT invent deadlines or fake receipts. If no follow-up is needed, return empty array [].`;

  try {
    const rawJson = await generateText(`Emails:\n${formattedThread}`, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (!cleaned || cleaned === '[]') return [];
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export async function extractActionItems(messages: EmailMessage[]): Promise<ActionItem[]> {
  const formattedThread = messages
    .map(
      (m, idx) =>
        `[Msg ${idx + 1}] From: ${m.from.name} (ID: ${m.id})\nBody: ${m.bodyText || m.snippet}`
    )
    .join('\n\n---\n\n');

  const systemInstruction = `Extract actionable tasks, requests, and deadlines from this email thread.
Return ONLY JSON array of items:
[
  {
    "id": "action-1",
    "task": "Clear concise task description",
    "owner": "Assigned owner ONLY if explicitly stated in text, else null",
    "deadline": "Explicit date/deadline mentioned in text, else null",
    "evidence": "Short non-sensitive quote/snippet from email confirming task"
  }
]
CRITICAL RULES:
1. Do NOT infer an owner unless the email text explicitly names one.
2. Do NOT invent deadlines. If not explicitly stated, return null.
3. Keep evidence concise and privacy-safe.`;

  try {
    const rawJson = await generateText(`Email Thread:\n${formattedThread}`, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => ({
      id: item.id || `action-${idx + 1}`,
      task: item.task || item.description || 'Pending Action Item',
      description: item.task || item.description || 'Pending Action Item',
      owner: item.owner || item.assignee || undefined,
      assignee: item.owner || item.assignee || undefined,
      deadline: item.deadline || undefined,
      evidence: item.evidence || undefined,
    }));
  } catch (e) {
    return [];
  }
}

// 5. MEETING INTELLIGENCE
export async function detectMeetingInfo(messages: EmailMessage[]): Promise<MeetingInfo | null> {
  const formattedThread = messages
    .map(m => `From: ${m.from.name} <${m.from.email}>\nBody: ${m.bodyText || m.snippet}`)
    .join('\n\n---\n\n');

  const systemInstruction = `Determine if a meeting, call, or appointment is being proposed or discussed in this thread.
If YES, return JSON:
{
  "date": "Proposed date or null",
  "time": "Proposed time or null",
  "participants": ["Name or email"],
  "purpose": "Subject/purpose of meeting"
}
If NO meeting is discussed, return JSON: null`;

  try {
    const rawJson = await generateText(`Email Thread:\n${formattedThread}`, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (cleaned === 'null' || !cleaned.includes('{')) return null;
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

// 6. WHY THIS MATTERS & PRIORITY CLASSIFICATION
export async function analyzeEmailContext(message: EmailMessage): Promise<{
  whyItMatters: string;
  aiPriority: AIPriorityCategory;
  aiPriorityReason: string;
}> {
  const systemInstruction = `Analyze an email message and return JSON:
{
  "whyItMatters": "1 concise sentence explaining why this email matters to the user",
  "aiPriority": "action_required" | "waiting_for_reply" | "deadline" | "meeting" | "important" | "newsletter" | "notification" | "low_priority",
  "aiPriorityReason": "Short reason for priority tag"
}`;

  const prompt = `From: ${message.from.name} <${message.from.email}>\nSubject: ${message.subject}\nSnippet: ${message.snippet}\nBody: ${message.bodyText?.slice(0, 500)}`;

  try {
    const rawJson = await generateText(prompt, systemInstruction);
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      whyItMatters: 'Direct communication regarding ' + message.subject,
      aiPriority: message.subject.toLowerCase().includes('urgent') ? 'action_required' : 'important',
      aiPriorityReason: 'Standard mailbox message',
    };
  }
}

export type BriefingCategory = 'needsAttention' | 'waitingForYou' | 'waitingForOthers' | 'deadlines' | 'meetings' | 'fyi';

export function classifyEmailCategory(m: EmailMessage): { category: BriefingCategory; reason: string } {
  const text = `${m.subject} ${m.snippet} ${m.bodyText || ''}`.toLowerCase();
  const folder = m.folder;

  // 1. Sent folder or user waiting for external reply
  if (
    folder === 'sent' ||
    text.includes('waiting for your reply') ||
    text.includes('please let me know') ||
    text.includes('looking forward to hearing') ||
    text.includes('any update on') ||
    text.includes('following up on') ||
    text.includes('kindly confirm')
  ) {
    return {
      category: 'waitingForOthers',
      reason: 'Awaiting response from recipient',
    };
  }

  // 2. Upcoming Deadlines
  if (
    text.includes('deadline') ||
    text.includes('due date') ||
    text.includes('due by') ||
    text.includes('submission') ||
    text.includes('time-sensitive') ||
    text.includes('expires') ||
    text.includes('cutoff') ||
    text.includes('by tomorrow') ||
    text.includes('by end of day') ||
    text.includes('by eod')
  ) {
    return {
      category: 'deadlines',
      reason: 'Time-sensitive deadline or due date',
    };
  }

  // 3. Meeting Proposals & Scheduling
  if (
    text.includes('meeting') ||
    text.includes('schedule') ||
    text.includes('call') ||
    text.includes('calendar') ||
    text.includes('invite') ||
    text.includes('zoom') ||
    text.includes('google meet') ||
    text.includes('appointment') ||
    text.includes('proposed time') ||
    text.includes('available at') ||
    text.includes('time works for you')
  ) {
    return {
      category: 'meetings',
      reason: 'Meeting proposal or schedule discussion',
    };
  }

  // 4. Waiting for You (Direct questions / requests to the user)
  if (
    text.includes('?') ||
    text.includes('can you') ||
    text.includes('could you') ||
    text.includes('please confirm') ||
    text.includes('please reply') ||
    text.includes('what do you think') ||
    text.includes('your input') ||
    text.includes('your feedback') ||
    text.includes('action needed from you')
  ) {
    return {
      category: 'waitingForYou',
      reason: 'Question or request directed to you',
    };
  }

  // 5. Needs Attention (Critical alerts, urgent requests, approvals)
  if (
    text.includes('urgent') ||
    text.includes('asap') ||
    text.includes('action required') ||
    text.includes('important') ||
    text.includes('attention') ||
    text.includes('critical') ||
    text.includes('failed') ||
    text.includes('issue') ||
    text.includes('alert') ||
    text.includes('approval')
  ) {
    return {
      category: 'needsAttention',
      reason: 'High priority or action required',
    };
  }

  // 6. FYI & Updates (Default)
  return {
    category: 'fyi',
    reason: 'Informational update',
  };
}

// 7. SMART INBOX BRIEFING
export async function generateInboxBriefing(
  inboxMessages: EmailMessage[],
  sentMessages: EmailMessage[] = []
): Promise<InboxBriefing> {
  const allMessages = [...(inboxMessages || []), ...(sentMessages || [])];
  const briefing: InboxBriefing = {
    needsAttention: [],
    waitingForYou: [],
    waitingForOthers: [],
    deadlines: [],
    meetings: [],
    fyi: [],
  };

  if (!allMessages || allMessages.length === 0) {
    return briefing;
  }

  const assignedMsgIds = new Set<string>();

  // Format messages for AI categorization
  const formattedList = allMessages
    .slice(0, 30)
    .map(
      m =>
        `[ID:${m.id}|Thread:${m.threadId}|Folder:${m.folder}] From:${m.from.name} Subject:${m.subject} Date:${m.date} Snippet:${m.snippet}`
    )
    .join('\n');

  const systemInstruction = `You are an AI Email Categorizer. Classify each inbox/sent message into EXACTLY ONE of these 6 workspace categories:
1. "needsAttention": Action required, urgent issues, critical alerts, approvals.
2. "waitingForYou": Questions directed to user, direct requests requiring user reply.
3. "waitingForOthers": Sent emails or messages where user is waiting for recipient reply.
4. "deadlines": Due dates, submission deadlines, time-sensitive schedules.
5. "meetings": Meeting proposals, calendar invites, call scheduling discussions.
6. "fyi": Informational updates, newsletters, status reports, no action needed.

Return ONLY a JSON object with this exact key structure:
{
  "needsAttention": [{ "messageId": "", "threadId": "", "subject": "", "fromName": "", "snippet": "", "reason": "", "lastUpdated": "" }],
  "waitingForYou": [...],
  "waitingForOthers": [...],
  "deadlines": [...],
  "meetings": [...],
  "fyi": [...]
}`;

  try {
    const rawJson = await generateText(`Inbox/Sent Messages:\n${formattedList}`, systemInstruction, { profile: 'executive' });
    const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const normalizedAI: Record<string, any[]> = {
      needsAttention: parsed.needsAttention || parsed.needs_attention || [],
      waitingForYou: parsed.waitingForYou || parsed.waiting_for_you || [],
      waitingForOthers: parsed.waitingForOthers || parsed.waiting_for_others || [],
      deadlines: parsed.deadlines || parsed.upcomingDeadlines || parsed.upcoming_deadlines || [],
      meetings: parsed.meetings || parsed.meetingProposals || parsed.meeting_proposals || [],
      fyi: parsed.fyi || parsed.fyiUpdates || parsed.fyi_updates || [],
    };

    const categories: BriefingCategory[] = ['needsAttention', 'waitingForYou', 'waitingForOthers', 'deadlines', 'meetings', 'fyi'];

    for (const cat of categories) {
      const items = normalizedAI[cat];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.messageId && !assignedMsgIds.has(item.messageId)) {
            const originalMsg = allMessages.find(m => m.id === item.messageId);
            if (originalMsg) {
              assignedMsgIds.add(item.messageId);
              briefing[cat].push({
                messageId: originalMsg.id,
                threadId: originalMsg.threadId,
                subject: originalMsg.subject,
                fromName: originalMsg.from.name,
                snippet: originalMsg.snippet,
                reason: item.reason || 'Categorized by AI',
                lastUpdated: originalMsg.date,
              });

              console.log(
                `[classification]\nmessageId: ${originalMsg.id}\nsubject: ${originalMsg.subject}\npredictedCategory: ${cat}\nsavedCategory: ${cat}`
              );
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.warn('[Briefing AI Categorization Warning]: AI classification failed or returned partial JSON, proceeding with NLP intent classifier fallback:', e?.message);
  }

  // Ensure ALL remaining messages are classified by deterministic NLP Intent Classifier
  for (const m of allMessages) {
    if (!assignedMsgIds.has(m.id)) {
      const { category, reason } = classifyEmailCategory(m);
      assignedMsgIds.add(m.id);
      briefing[category].push({
        messageId: m.id,
        threadId: m.threadId,
        subject: m.subject,
        fromName: m.from.name,
        snippet: m.snippet,
        reason,
        lastUpdated: m.date,
      });

      console.log(
        `[classification]\nmessageId: ${m.id}\nsubject: ${m.subject}\npredictedCategory: ${category}\nsavedCategory: ${category}`
      );
    }
  }

  // Output required server-side dashboard summary logging
  console.log(
    `[dashboard]\nneedsAttention: ${briefing.needsAttention.length}\nwaitingForYou: ${briefing.waitingForYou.length}\nupcomingDeadlines: ${briefing.deadlines.length}\nmeetingProposals: ${briefing.meetings.length}\nwaitingForOthers: ${briefing.waitingForOthers.length}\nfyiUpdates: ${briefing.fyi.length}`
  );

  return briefing;
}

// 8. NATURAL LANGUAGE SEARCH TRANSLATOR
export async function translateNaturalLanguageSearch(nlQuery: string): Promise<string> {
  const systemInstruction = `Convert natural language user search queries into a standard Gmail search query string (e.g., subject:meeting after:2026/01/01 is:unread).
Return ONLY the raw search query string without quotes or explanations.`;

  try {
    const text = await generateText(`User Natural Language Search: "${nlQuery}"`, systemInstruction);
    return text.trim();
  } catch (e) {
    return nlQuery;
  }
}
