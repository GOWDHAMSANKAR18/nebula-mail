'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EmailMessage, EmailFilters, ComposeDraft, MailProvider, AIProfile } from '@/types/email';
import { AppContextState, AssistantMessage, AssistantToolCall, ToolName } from '@/types/assistant';
import { getMailProvider } from '@/lib/gmail/provider';
import { useSession } from 'next-auth/react';
import { UndoSendToast } from '@/components/mail/UndoSendToast';

interface AppContextType {
  state: AppContextState;
  messages: EmailMessage[];
  isLoading: boolean;
  error: string | null;
  assistantMessages: AssistantMessage[];
  isAssistantThinking: boolean;
  pendingConfirmationDraft: ComposeDraft | null;
  pendingToolCallId: string | null;
  undoTrashItem: { id: string; subject: string } | null;

  // Handlers
  setSelectedProfile: (profile: AIProfile) => void;
  setFolder: (folder: EmailFilters['folder']) => void;
  setWorkspaceView: () => void;
  setFilters: (filters: EmailFilters) => void;
  openEmailDetail: (emailId: string) => Promise<void>;
  closeEmailDetail: () => void;
  openCompose: (draft?: Partial<ComposeDraft>) => void;
  closeCompose: () => void;
  setComposeDraft: (draft: ComposeDraft) => void;
  sendEmailAction: (draft: ComposeDraft) => Promise<void>;
  saveDraftAction: (draft: ComposeDraft) => Promise<void>;
  confirmPendingSend: () => Promise<void>;
  cancelPendingSend: () => void;
  generateAIReply: (threadId?: string, messageId?: string, mode?: string) => Promise<string>;
  replyToCurrentEmail: (body?: string, mode?: 'reply' | 'replyAll' | 'aiReply') => void;
  sendAssistantMessage: (text: string) => Promise<void>;
  retryToolExecution: (msgId: string, toolCall: AssistantToolCall) => Promise<void>;
  refreshEmails: () => Promise<void>;
  toggleStar: (messageId: string) => Promise<void>;
  trashEmail: (messageId: string) => Promise<void>;
  restoreEmail: (messageId: string) => Promise<void>;
  deleteEmailPermanently: (messageId: string) => Promise<void>;
  clearUndoToast: () => void;
  markAsRead: (messageId: string, isRead: boolean) => Promise<void>;
  executeTool: (msgId: string, toolCall: AssistantToolCall) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const sessionError = (session as any)?.error;
  const provider = useMemo(() => getMailProvider(accessToken), [accessToken]);

  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Execution lock set to prevent React Strict Mode duplicate tool calls
  const executedToolIdsRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState<AppContextState>({
    currentView: 'inbox',
    currentEmailId: undefined,
    currentEmail: undefined,
    currentFilters: { folder: 'inbox' },
    composeDraft: undefined,
    isComposeOpen: false,
    selectedMessageIds: [],
    selectedProfile: 'professional',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('nebula_ai_profile') as AIProfile | null;
      if (
        savedProfile &&
        ['professional', 'friendly', 'concise', 'technical', 'creative', 'executive'].includes(savedProfile)
      ) {
        setState(prev => ({ ...prev, selectedProfile: savedProfile }));
      }
    }
  }, []);

  const setSelectedProfile = (profile: AIProfile) => {
    setState(prev => ({ ...prev, selectedProfile: profile }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('nebula_ai_profile', profile);
    }
  };

  const [pendingConfirmationDraft, setPendingConfirmationDraft] = useState<ComposeDraft | null>(null);
  const [pendingToolCallId, setPendingToolCallId] = useState<string | null>(null);
  const [undoTrashItem, setUndoTrashItem] = useState<{ id: string; subject: string } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [undoSendItem, setUndoSendItem] = useState<{ draft: ComposeDraft; countdown: number } | null>(null);
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hello! I'm your Nebula AI Copilot. I directly control the application UI: searching emails, opening messages, filling compose drafts, and replying in context. How can I help you?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);

  // In-flight fetch deduplication ref & rate-limit backoff ref
  const inFlightFetchRef = useRef<Map<string, Promise<void>>>(new Map());
  const rateLimitUntilRef = useRef<number>(0);
  const loadEmailsRef = useRef<(filters?: EmailFilters) => Promise<void>>(async () => {});

  // Load email messages from MailProvider / API with in-flight deduplication & rate-limit protection
  const loadEmails = useCallback(async (filters?: EmailFilters) => {
    const now = Date.now();
    if (now < rateLimitUntilRef.current) {
      console.warn('[AppContext] Skipping fetch due to active 30s rate-limit cooldown.');
      return;
    }

    if (sessionError === 'RefreshAccessTokenError') {
      setError('Gmail session token expired and refresh failed. Please re-authenticate.');
      setIsLoading(false);
      return;
    }

    const mergedFilters = { ...state.currentFilters, ...filters };
    const requestKey = JSON.stringify(mergedFilters);

    // Deduplicate identical in-flight requests
    if (inFlightFetchRef.current.has(requestKey)) {
      return inFlightFetchRef.current.get(requestKey);
    }

    const fetchPromise = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (session) {
          const params = new URLSearchParams();
          if (mergedFilters.folder) params.set('folder', mergedFilters.folder);
          if (mergedFilters.query) params.set('query', mergedFilters.query);
          if (mergedFilters.from) params.set('from', mergedFilters.from);
          if (mergedFilters.startDate) params.set('startDate', mergedFilters.startDate);
          if (mergedFilters.endDate) params.set('endDate', mergedFilters.endDate);
          if (mergedFilters.unreadOnly) params.set('unreadOnly', 'true');
          if (mergedFilters.starredOnly) params.set('starredOnly', 'true');
          if (mergedFilters.hasAttachment) params.set('hasAttachment', 'true');
          if (mergedFilters.sort) params.set('sort', mergedFilters.sort);

          const res = await fetch(`/api/mail/messages?${params.toString()}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Gmail API error (${res.status})`;
            if (res.status === 403 || res.status === 429 || errMsg.includes('rateLimitExceeded')) {
              rateLimitUntilRef.current = Date.now() + 30000;
              throw new Error('Gmail API rate limit reached. Synchronization paused temporarily for 30s.');
            }
            throw new Error(errMsg);
          }
          const data = await res.json();
          const rawMsgs: EmailMessage[] = data.messages || [];
          const msgMap = new Map<string, EmailMessage>();
          rawMsgs.forEach(m => msgMap.set(m.id, m));
          const list = Array.from(msgMap.values());
          if (mergedFilters.sort === 'oldest') {
            list.sort((a, b) => a.timestamp - b.timestamp);
          } else {
            list.sort((a, b) => b.timestamp - a.timestamp);
          }
          setMessages(list);
        } else {
          const res = await provider.listMessages(mergedFilters);
          const rawMsgs: EmailMessage[] = res.messages || [];
          const msgMap = new Map<string, EmailMessage>();
          rawMsgs.forEach(m => msgMap.set(m.id, m));
          const list = Array.from(msgMap.values());
          if (mergedFilters.sort === 'oldest') {
            list.sort((a, b) => a.timestamp - b.timestamp);
          } else {
            list.sort((a, b) => b.timestamp - a.timestamp);
          }
          setMessages(list);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load emails from Gmail provider.');
      } finally {
        setIsLoading(false);
        inFlightFetchRef.current.delete(requestKey);
      }
    })();

    inFlightFetchRef.current.set(requestKey, fetchPromise);
    return fetchPromise;
  }, [session, sessionError, provider, state.currentFilters]);

  useEffect(() => {
    loadEmailsRef.current = loadEmails;
  }, [loadEmails]);

  useEffect(() => {
    loadEmails();
  }, [state.currentFilters, session]);

  // Connect Real-Time SSE Sync (Stable connection)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/mail/sync');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync' || data.type === 'new_mail') {
            loadEmailsRef.current();
          } else if (data.type === 'rate_limited') {
            rateLimitUntilRef.current = Date.now() + 30000;
          }
        } catch (e) {
          // Ignore parsing heartbeats
        }
      };
    } catch (e) {
      console.warn('SSE Realtime sync connection failed:', e);
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  // Helper to update specific tool status inside chat messages
  const updateToolStatusInMessage = (
    msgId: string,
    toolCallId: string,
    status: AssistantToolCall['status'],
    result?: any,
    toolError?: string
  ) => {
    setAssistantMessages(prev =>
      prev.map(msg => {
        if (msg.id === msgId && msg.toolCalls) {
          return {
            ...msg,
            toolCalls: msg.toolCalls.map(tc =>
              tc.id === toolCallId
                ? { ...tc, status, result, error: toolError }
                : tc
            ),
          };
        }
        return msg;
      })
    );
  };

  // Execute AI Assistant Tools with explicit lifecycle (executing -> completed / failed)
  const executeTool = async (msgId: string, toolCall: AssistantToolCall): Promise<any> => {
    if (executedToolIdsRef.current.has(toolCall.id)) {
      console.log(`[Tool Execution Skipped - Already Executed] ${toolCall.id}`);
      return;
    }
    executedToolIdsRef.current.add(toolCall.id);

    console.log(`[Executing AI Tool] ${toolCall.name} (ID: ${toolCall.id})`, toolCall.args);
    updateToolStatusInMessage(msgId, toolCall.id, 'executing');

    try {
      let toolResult: any = null;

      switch (toolCall.name) {
        case 'searchEmails': {
          const filters: EmailFilters = {
            query: toolCall.args.query,
            from: toolCall.args.from,
            startDate: toolCall.args.startDate,
            endDate: toolCall.args.endDate,
            unreadOnly: toolCall.args.unreadOnly,
            starredOnly: toolCall.args.starredOnly,
            hasAttachment: toolCall.args.hasAttachment,
            folder: toolCall.args.folder || (state.currentView === 'compose' || state.currentView === 'email' ? 'inbox' : state.currentFilters.folder),
            sort: toolCall.args.sort,
          };
          setState(prev => ({ ...prev, currentFilters: filters, currentView: filters.folder || 'inbox' }));
          await loadEmails(filters);
          toolResult = { count: messages.length, filters };
          break;
        }

        case 'openEmail': {
          if (toolCall.args.messageId) {
            await openEmailDetail(toolCall.args.messageId);
            toolResult = { success: true, messageId: toolCall.args.messageId };
          } else {
            throw new Error('Message ID is required to open an email.');
          }
          break;
        }

        case 'openCompose':
        case 'fillCompose': {
          const draft: ComposeDraft = {
            to: toolCall.args.to || state.composeDraft?.to || '',
            subject: toolCall.args.subject || state.composeDraft?.subject || '',
            body: toolCall.args.body || state.composeDraft?.body || '',
          };
          setState(prev => ({
            ...prev,
            isComposeOpen: true,
            composeDraft: draft,
          }));
          toolResult = { success: true, draft };
          break;
        }

        case 'sendEmail': {
          // Enforce Human-In-The-Loop Confirmation before actual send!
          const draft: ComposeDraft = {
            to: toolCall.args.to,
            subject: toolCall.args.subject,
            body: toolCall.args.body,
            threadId: toolCall.args.threadId,
          };
          setPendingConfirmationDraft(draft);
          setPendingToolCallId(toolCall.id);
          updateToolStatusInMessage(msgId, toolCall.id, 'requires_confirmation', { draft });
          return { requiresConfirmation: true, draft };
        }

        case 'replyToEmail': {
          let parentEmail = state.currentEmail;
          const targetMsgId = toolCall.args.messageId || state.currentEmailId || state.currentEmail?.id;
          if (targetMsgId) {
            if (state.currentEmail && state.currentEmail.id === targetMsgId) {
              parentEmail = state.currentEmail;
            } else {
              try {
                parentEmail = await provider.getMessage(targetMsgId);
              } catch (e) {
                console.warn('[replyToEmail] Could not fetch parent message by ID:', targetMsgId, e);
              }
            }
          }
          if (!parentEmail && state.currentView === 'email' && messages.length > 0) {
            parentEmail = messages[0];
          }

          if (parentEmail) {
            const draft: ComposeDraft = {
              to: parentEmail.from.email,
              subject: parentEmail.subject.startsWith('Re:') ? parentEmail.subject : `Re: ${parentEmail.subject}`,
              body: toolCall.args.body || '',
              threadId: parentEmail.threadId,
              replyToId: parentEmail.id,
              isReply: true,
            };
            setState(prev => ({
              ...prev,
              isComposeOpen: true,
              composeDraft: draft,
            }));
            toolResult = { success: true, draft, parentSubject: parentEmail.subject };
          } else {
            updateToolStatusInMessage(msgId, toolCall.id, 'failed', null, 'Please open an email before using AI Reply.');
            return { error: 'Please open an email before using AI Reply.' };
          }
          break;
        }

        case 'forwardEmail': {
          let parentEmail = state.currentEmail;
          const targetMsgId = toolCall.args.messageId || state.currentEmailId || state.currentEmail?.id;
          if (targetMsgId) {
            if (state.currentEmail && state.currentEmail.id === targetMsgId) {
              parentEmail = state.currentEmail;
            } else {
              try {
                parentEmail = await provider.getMessage(targetMsgId);
              } catch (e) {
                console.warn('[forwardEmail] Could not fetch parent message by ID:', targetMsgId, e);
              }
            }
          }
          if (!parentEmail && state.currentView === 'email' && messages.length > 0) {
            parentEmail = messages[0];
          }

          if (parentEmail) {
            const draft: ComposeDraft = {
              to: toolCall.args.to || '',
              subject: parentEmail.subject.startsWith('Fwd:') ? parentEmail.subject : `Fwd: ${parentEmail.subject}`,
              body: (toolCall.args.body ? `${toolCall.args.body}\n\n` : '') +
                `---------- Forwarded message ---------\nFrom: ${parentEmail.from.name} <${parentEmail.from.email}>\nDate: ${parentEmail.date}\nSubject: ${parentEmail.subject}\n\n${parentEmail.bodyText}`,
            };
            setState(prev => ({
              ...prev,
              isComposeOpen: true,
              composeDraft: draft,
            }));
            toolResult = { success: true, draft, parentSubject: parentEmail.subject };
          } else {
            updateToolStatusInMessage(msgId, toolCall.id, 'failed', null, 'Please open an email before forwarding.');
            return { error: 'Please open an email before forwarding.' };
          }
          break;
        }

        case 'applyFilter': {
          const newFilters: EmailFilters = {
            ...state.currentFilters,
            unreadOnly: toolCall.args.unreadOnly ?? state.currentFilters.unreadOnly,
            starredOnly: toolCall.args.starredOnly ?? state.currentFilters.starredOnly,
            folder: toolCall.args.folder ?? state.currentFilters.folder,
          };
          setState(prev => ({
            ...prev,
            currentFilters: newFilters,
            currentView: newFilters.folder || 'inbox',
          }));
          await loadEmails(newFilters);
          toolResult = { success: true, count: messages.length, filters: newFilters };
          break;
        }

        case 'navigateTo': {
          const targetView = toolCall.args.view || 'inbox';
          if (targetView === 'compose') {
            setState(prev => ({ ...prev, isComposeOpen: true }));
          } else {
            const newFilters = { ...state.currentFilters, folder: targetView as EmailFilters['folder'] };
            setState(prev => ({
              ...prev,
              currentView: targetView as any,
              currentFilters: newFilters,
              currentEmail: undefined,
              currentEmailId: undefined,
            }));
            await loadEmails(newFilters);
          }
          toolResult = { success: true, view: targetView };
          break;
        }

        default:
          throw new Error(`Unknown tool action: ${toolCall.name}`);
      }

      updateToolStatusInMessage(msgId, toolCall.id, 'completed', toolResult);
      return toolResult;
    } catch (err: any) {
      console.error(`[Tool Execution Failed] ${toolCall.name}:`, err);
      updateToolStatusInMessage(msgId, toolCall.id, 'failed', null, err?.message || 'Execution failed');
      return { error: err?.message || 'Execution failed' };
    }
  };

  const retryToolExecution = async (msgId: string, toolCall: AssistantToolCall) => {
    executedToolIdsRef.current.delete(toolCall.id);
    await executeTool(msgId, toolCall);
  };

  const setFolder = (folder: EmailFilters['folder']) => {
    const filters = { ...state.currentFilters, folder, query: undefined, from: undefined };
    setState(prev => ({
      ...prev,
      currentView: folder || 'inbox',
      currentFilters: filters,
      currentEmail: undefined,
      currentEmailId: undefined,
    }));
  };

  const setWorkspaceView = () => {
    setState(prev => ({
      ...prev,
      currentView: 'workspace',
      currentEmail: undefined,
      currentEmailId: undefined,
    }));
  };

  const setFilters = (filters: EmailFilters) => {
    setState(prev => ({ ...prev, currentFilters: filters }));
  };

  const openEmailDetail = async (emailId: string) => {
    try {
      let email: EmailMessage;
      if (session) {
        const res = await fetch(`/api/mail/message/${emailId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch message (${res.status})`);
        }
        email = await res.json();
      } else {
        email = await provider.getMessage(emailId);
      }
      setState(prev => ({
        ...prev,
        currentView: 'email',
        currentEmailId: email.id,
        currentThreadId: email.threadId,
        currentEmail: email,
      }));

      // Auto mark as read in Gmail API and UI if unread
      if (!email.isRead) {
        markAsRead(email.id, true);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load email detail');
    }
  };

  const closeEmailDetail = () => {
    setState(prev => ({
      ...prev,
      currentView: prev.currentFilters.folder || 'inbox',
      currentEmail: undefined,
      currentEmailId: undefined,
    }));
  };

  const openCompose = (draft?: Partial<ComposeDraft>) => {
    setState(prev => ({
      ...prev,
      isComposeOpen: true,
      composeDraft: {
        to: draft?.to || '',
        subject: draft?.subject || '',
        body: draft?.body || '',
      },
    }));
  };

  const closeCompose = () => {
    setState(prev => ({
      ...prev,
      isComposeOpen: false,
      composeDraft: undefined,
    }));
  };

  const setComposeDraft = (draft: ComposeDraft) => {
    setState(prev => ({ ...prev, composeDraft: draft }));
  };

  const handleUndoSend = () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (undoSendItem) {
      openCompose(undoSendItem.draft);
    }
    setUndoSendItem(null);
  };

  const executeRealSend = async (draft: ComposeDraft) => {
    setIsLoading(true);
    try {
      if (session) {
        const res = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Gmail send failed (${res.status})`);
        }
      } else {
        await provider.sendMessage(draft);
      }
      await loadEmails();
    } catch (err: any) {
      setError(err?.message || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailAction = async (draft: ComposeDraft) => {
    closeCompose();
    setPendingConfirmationDraft(null);
    setPendingToolCallId(null);

    let secondsRemaining = 5;
    setUndoSendItem({ draft, countdown: secondsRemaining });

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining > 0) {
        setUndoSendItem({ draft, countdown: secondsRemaining });
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
    }, 1000);

    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(async () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setUndoSendItem(null);
      await executeRealSend(draft);
    }, 5000);
  };

  const saveDraftAction = async (draft: ComposeDraft) => {
    setIsLoading(true);
    try {
      if (session) {
        const res = await fetch('/api/mail/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Gmail draft save failed (${res.status})`);
        }
      } else {
        await provider.saveDraft(draft);
      }
      closeCompose();
      await loadEmails();
    } catch (err: any) {
      setError(err?.message || 'Failed to save draft to Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPendingSend = async () => {
    if (pendingConfirmationDraft) {
      await sendEmailAction(pendingConfirmationDraft);

      if (pendingToolCallId) {
        setAssistantMessages(prev =>
          prev.map(msg => ({
            ...msg,
            toolCalls: msg.toolCalls?.map(tc =>
              tc.id === pendingToolCallId ? { ...tc, status: 'completed', result: { sent: true } } : tc
            ),
          }))
        );
      }

      setAssistantMessages(prev => [
        ...prev,
        {
          id: `sys-send-${Date.now()}`,
          role: 'system',
          content: `Email successfully sent to ${pendingConfirmationDraft.to}! Mailbox updated.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const cancelPendingSend = () => {
    if (pendingToolCallId) {
      setAssistantMessages(prev =>
        prev.map(msg => ({
          ...msg,
          toolCalls: msg.toolCalls?.map(tc =>
            tc.id === pendingToolCallId ? { ...tc, status: 'failed', error: 'User cancelled email send.' } : tc
          ),
        }))
      );
    }
    setPendingConfirmationDraft(null);
    setPendingToolCallId(null);
  };

  const generateAIReply = async (threadId?: string, messageId?: string, mode?: string): Promise<string> => {
    const targetThreadId = threadId || state.currentThreadId || state.currentEmail?.threadId;
    const targetMessageId = messageId || state.currentEmailId || state.currentEmail?.id;
    if (!targetThreadId && !targetMessageId) {
      throw new Error('Please open an email before using AI Reply.');
    }
    const activeProfile =
      (mode && ['professional', 'friendly', 'concise', 'technical', 'creative', 'executive'].includes(mode))
        ? mode
        : (state.selectedProfile || 'professional');

    const res = await fetch('/api/ai/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: targetThreadId,
        messageId: targetMessageId,
        mode: mode || 'professional',
        profile: activeProfile,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `AI reply generation failed (${res.status})`);
    }

    const data = await res.json();
    return data.reply || '';
  };

  const replyToCurrentEmail = (body?: string, mode: 'reply' | 'replyAll' | 'aiReply' = 'reply') => {
    if (state.currentEmail) {
      const currentEmail = state.currentEmail;
      const userEmail = ((session as any)?.user?.email || '').toLowerCase();

      let to = currentEmail.from.email;
      let cc = '';

      if (mode === 'replyAll') {
        const ccEmails = new Set<string>();
        (currentEmail.to || []).forEach(t => {
          if (t.email && t.email.toLowerCase() !== userEmail && t.email.toLowerCase() !== to.toLowerCase()) {
            ccEmails.add(t.email);
          }
        });
        (currentEmail.cc || []).forEach(c => {
          if (c.email && c.email.toLowerCase() !== userEmail && c.email.toLowerCase() !== to.toLowerCase()) {
            ccEmails.add(c.email);
          }
        });
        cc = Array.from(ccEmails).join(', ');
      }

      openCompose({
        to,
        cc,
        subject: currentEmail.subject.startsWith('Re:') ? currentEmail.subject : `Re: ${currentEmail.subject}`,
        body: body || '',
        threadId: currentEmail.threadId,
        replyToId: currentEmail.id,
        inReplyTo: currentEmail.messageIdHeader || currentEmail.id,
        references: currentEmail.messageIdHeader || currentEmail.id,
        isReply: true,
        replyMode: mode,
      });
    }
  };

  const sendAssistantMessage = async (userPrompt: string) => {
    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: AssistantMessage = {
      id: userMsgId,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAssistantMessages(prev => [...prev, userMsg]);
    setIsAssistantThinking(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          history: assistantMessages,
          context: state,
          profile: state.selectedProfile || 'professional',
        }),
      });

      let aiMsg: AssistantMessage;
      let toolCalls: AssistantToolCall[] = [];

      if (res.ok) {
        const data = await res.json();
        aiMsg = data.message;
        toolCalls = data.toolCalls || [];
      } else {
        const { processAssistantRequest } = await import('@/lib/ai/assistantEngine');
        const fallbackRes = await processAssistantRequest(userPrompt, assistantMessages, state);
        aiMsg = fallbackRes.message;
        toolCalls = fallbackRes.toolCalls;
      }

      setAssistantMessages(prev => [...prev, aiMsg]);

      // Execute tool calls sequentially (stops if a step fails)
      for (const tc of toolCalls) {
        if (tc.status === 'failed') {
          console.warn(`[Tool Engine] Pre-validation failed for ${tc.name}. Halting sequence.`);
          break;
        }
        const res = await executeTool(aiMsg.id, tc);
        if (res && res.error) {
          console.warn(`[Tool Engine] Tool ${tc.name} execution failed. Halting subsequent steps.`);
          break;
        }
      }
    } catch (err: any) {
      console.error('Error processing assistant message:', err);
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const refreshEmails = async () => {
    await loadEmails();
  };

  const toggleStar = async (messageId: string) => {
    try {
      await provider.toggleStar(messageId);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, isStarred: !m.isStarred } : m))
      );
      if (state.currentFilters.folder === 'starred') {
        await loadEmails();
      }
    } catch (err: any) {
      console.error('Failed to toggle star:', err);
    }
  };

  const trashEmail = async (messageId: string) => {
    try {
      const target = messages.find(m => m.id === messageId) || state.currentEmail;
      setUndoTrashItem({
        id: messageId,
        subject: target?.subject || 'Conversation',
      });

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setUndoTrashItem(null);
      }, 8000);

      if (session) {
        await fetch('/api/mail/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });
      } else {
        await provider.trashMessage(messageId);
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (state.currentEmailId === messageId) {
        closeEmailDetail();
      }
    } catch (err: any) {
      console.error('Failed to trash email:', err);
    }
  };

  const restoreEmail = async (messageId: string) => {
    try {
      if (session) {
        await fetch('/api/mail/trash/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });
      } else {
        await provider.restoreMessage(messageId);
      }
      setUndoTrashItem(null);
      await loadEmails();
    } catch (err: any) {
      console.error('Failed to restore email:', err);
    }
  };

  const deleteEmailPermanently = async (messageId: string) => {
    try {
      if (session) {
        await fetch('/api/mail/trash/permanent', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });
      } else {
        await provider.deletePermanently(messageId);
      }
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (state.currentEmailId === messageId) {
        closeEmailDetail();
      }
    } catch (err: any) {
      console.error('Failed to permanently delete email:', err);
    }
  };

  const clearUndoToast = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoTrashItem(null);
  };

  const markAsRead = async (messageId: string, isRead: boolean) => {
    try {
      if (session) {
        await fetch(`/api/mail/message/${messageId}/read`, {
          method: 'POST',
        });
      } else {
        await provider.markAsRead(messageId, isRead);
      }

      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, isRead } : m))
      );

      if (state.currentEmail && state.currentEmail.id === messageId) {
        setState(prev => ({
          ...prev,
          currentEmail: prev.currentEmail ? { ...prev.currentEmail, isRead } : undefined,
        }));
      }
    } catch (err: any) {
      console.error('Failed to mark message as read:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        messages,
        isLoading,
        error,
        assistantMessages,
        isAssistantThinking,
        pendingConfirmationDraft,
        pendingToolCallId,
        undoTrashItem,
        setSelectedProfile,
        setFolder,
        setWorkspaceView,
        setFilters,
        openEmailDetail,
        closeEmailDetail,
        openCompose,
        closeCompose,
        setComposeDraft,
        sendEmailAction,
        saveDraftAction,
        confirmPendingSend,
        cancelPendingSend,
        generateAIReply,
        replyToCurrentEmail,
        sendAssistantMessage,
        retryToolExecution,
        refreshEmails,
        toggleStar,
        trashEmail,
        restoreEmail,
        deleteEmailPermanently,
        clearUndoToast,
        markAsRead,
        executeTool,
      }}
    >
      {children}

      {undoSendItem && (
        <UndoSendToast
          recipient={undoSendItem.draft.to}
          countdownSeconds={undoSendItem.countdown}
          onUndo={handleUndoSend}
        />
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
