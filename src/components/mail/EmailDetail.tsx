'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Reply,
  Users,
  Sparkles,
  Star,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Send,
  X,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  CheckCircle2,
  FileText,
  Clock,
  UserCheck,
  Forward,
} from 'lucide-react';
import sanitizeHtml from 'sanitize-html';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { AIReplyMode, EmailMessage, ThreadSummary } from '@/types/email';
import { AIContextPanel } from './AIContextPanel';

export function EmailDetail() {
  const {
    state,
    closeEmailDetail,
    toggleStar,
    trashEmail,
    restoreEmail,
    deleteEmailPermanently,
    generateAIReply,
    sendEmailAction,
  } = useApp();
  const { data: session } = useSession();
  const email = state.currentEmail;

  // Thread & Messages State
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>(email ? [email] : []);
  const [isThreadLoading, setIsThreadLoading] = useState<boolean>(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set(email ? [email.id] : []));

  // AI Summary State
  const [threadSummary, setThreadSummary] = useState<ThreadSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [showPermDeleteModal, setShowPermDeleteModal] = useState<boolean>(false);

  // Reply Editor State
  const [isReplyOpen, setIsReplyOpen] = useState<boolean>(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'aiReply'>('reply');
  const [aiMode, setAiMode] = useState<AIReplyMode>('detailed');
  const [replyTo, setReplyTo] = useState<string>('');
  const [replyCc, setReplyCc] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Fetch full conversation thread on load
  useEffect(() => {
    if (email?.threadId) {
      setIsThreadLoading(true);
      fetch(`/api/mail/thread/${email.threadId}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            setThreadMessages(data.messages);
            // Expand the latest message by default
            const latestMsg = data.messages[data.messages.length - 1];
            setExpandedMessageIds(new Set([latestMsg.id]));
          } else {
            setThreadMessages([email]);
          }
        })
        .catch(() => {
          setThreadMessages([email]);
        })
        .finally(() => setIsThreadLoading(false));
    }
  }, [email?.threadId, email?.id]);

  if (!email) {
    return null;
  }

  const toggleMessageExpansion = (msgId: string) => {
    setExpandedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        if (next.size > 1) next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleSummarizeThread = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/thread-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: email.threadId,
          messages: threadMessages,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setThreadSummary(data.summary);
      }
    } catch (e) {
      console.error('Failed to summarize thread:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDelete = async () => {
    await trashEmail(email.id);
    closeEmailDetail();
  };

  const handleRestore = async () => {
    await restoreEmail(email.id);
    closeEmailDetail();
  };

  const handleConfirmPermanentDelete = async () => {
    await deleteEmailPermanently(email.id);
    setShowPermDeleteModal(false);
    closeEmailDetail();
  };

  const handleStartReply = async (mode: 'reply' | 'replyAll' | 'aiReply', targetMsg?: EmailMessage) => {
    const msgToReply = targetMsg || email;
    setReplyMode(mode);
    setSendError(null);
    setAiError(null);

    const userEmail = ((session as any)?.user?.email || '').toLowerCase();
    const primaryTo = msgToReply.from.email;
    let ccStr = '';

    if (mode === 'replyAll') {
      const ccSet = new Set<string>();
      (msgToReply.to || []).forEach(t => {
        if (t.email && t.email.toLowerCase() !== userEmail && t.email.toLowerCase() !== primaryTo.toLowerCase()) {
          ccSet.add(t.email);
        }
      });
      (msgToReply.cc || []).forEach(c => {
        if (c.email && c.email.toLowerCase() !== userEmail && c.email.toLowerCase() !== primaryTo.toLowerCase()) {
          ccSet.add(c.email);
        }
      });
      ccStr = Array.from(ccSet).join(', ');
    }

    const subj = msgToReply.subject.startsWith('Re:') ? msgToReply.subject : `Re: ${msgToReply.subject}`;

    setReplyTo(primaryTo);
    setReplyCc(ccStr);
    setReplySubject(subj);
    setReplyBody('');
    setIsReplyOpen(true);

    if (mode === 'aiReply') {
      await runAIGeneration(aiMode, msgToReply);
    }
  };

  const runAIGeneration = async (selectedMode?: AIReplyMode, targetMsg?: EmailMessage) => {
    setIsGeneratingAI(true);
    setAiError(null);
    const modeToUse = selectedMode || aiMode;
    const msg = targetMsg || email;
    try {
      const generatedReply = await generateAIReply(msg.threadId, msg.id, modeToUse);
      setReplyBody(generatedReply);
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate AI reply.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleModeChange = async (newMode: AIReplyMode) => {
    setAiMode(newMode);
    await runAIGeneration(newMode);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyTo.trim()) {
      setSendError('Please specify a recipient email address.');
      return;
    }
    if (!replyBody.trim()) {
      setSendError('Reply body cannot be empty.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await sendEmailAction({
        to: replyTo.trim(),
        cc: replyCc.trim() || undefined,
        subject: replySubject.trim(),
        body: replyBody.trim(),
        threadId: email.threadId,
        replyToId: email.id,
        inReplyTo: email.messageIdHeader || email.id,
        references: email.messageIdHeader || email.id,
        isReply: true,
        replyMode,
      });

      setIsReplyOpen(false);
      setReplyBody('');
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelReply = () => {
    setIsReplyOpen(false);
    setReplyBody('');
    setAiError(null);
    setSendError(null);
  };

  const isTrashFolder = email.folder === 'trash';

  const aiModeOptions: { mode: AIReplyMode; label: string; icon: string }[] = [
    { mode: 'detailed', label: 'Detailed', icon: '📝' },
    { mode: 'brief', label: 'Brief', icon: '⚡' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] text-[#FFFFFF] overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-3.5 border-b border-[#2A2A2A] bg-[#0A0A0A]/90 backdrop-blur flex items-center justify-between shrink-0">
        <button
          onClick={closeEmailDetail}
          className="flex items-center space-x-2 text-[#A0A0A0] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#151515] transition text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mailbox</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSummarizeThread}
            disabled={isSummarizing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition text-xs font-semibold"
            title="Generate AI summary of the entire thread"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span>{isSummarizing ? 'Summarizing Thread...' : 'Summarize Thread'}</span>
          </button>

          {isTrashFolder ? (
            <>
              <button
                onClick={handleRestore}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Inbox</span>
              </button>

              <button
                onClick={() => setShowPermDeleteModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#E50914]/10 text-[#FF1A1A] hover:bg-[#E50914] hover:text-white border border-[#E50914]/30 transition text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleStartReply('reply')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] transition border border-[#2A2A2A] text-xs font-semibold"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>

              <button
                onClick={() => handleStartReply('replyAll')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] transition border border-[#2A2A2A] text-xs font-semibold"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Reply All</span>
              </button>

              <button
                onClick={() => handleStartReply('aiReply')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#E50914] text-white text-xs font-semibold hover:bg-[#FF1A1A] transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reply</span>
              </button>

              <button
                onClick={() => toggleStar(email.id)}
                className="p-2 rounded-lg text-[#A0A0A0] hover:text-amber-400 hover:bg-[#151515] transition"
                title="Toggle Star"
              >
                <Star className={`w-4 h-4 ${email.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>

              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-[#A0A0A0] hover:text-[#E50914] hover:bg-[#151515] transition"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Container with AI Side Panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main Conversation / Thread Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Thread Subject Title & Labels */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/30 uppercase tracking-wider">
                {email.folder}
              </span>
              {threadMessages.length > 1 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {threadMessages.length} Messages in Thread
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{email.subject || '(No Subject)'}</h1>
          </div>

          {/* AI Thread Summary Card */}
          {threadSummary && (
            <div className="p-5 rounded-2xl bg-[#0D0D1A] border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs tracking-wider uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Thread Summary</span>
                </div>
                <button
                  onClick={() => setThreadSummary(null)}
                  className="p-1 rounded text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-white mb-1">SUMMARY</h4>
                  <p className="text-[#A0A0A0] leading-relaxed">{threadSummary.shortSummary}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">MAIN TOPIC</h4>
                  <p className="text-[#A0A0A0]">{threadSummary.topic}</p>
                </div>
              </div>

              {threadSummary.decisions && threadSummary.decisions.length > 0 && (
                <div className="text-xs">
                  <h4 className="font-semibold text-emerald-400 mb-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DECISIONS MADE</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[#A0A0A0]">
                    {threadSummary.decisions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {threadSummary.actionItems && threadSummary.actionItems.length > 0 && (
                <div className="text-xs">
                  <h4 className="font-semibold text-amber-400 mb-1">ACTION ITEMS</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#A0A0A0]">
                    {threadSummary.actionItems.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-500/20 text-xs">
                {threadSummary.deadlines && threadSummary.deadlines.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-rose-400 mb-1 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>DEADLINES DETECTED</span>
                    </h4>
                    <p className="text-[#A0A0A0]">{threadSummary.deadlines.join(', ')}</p>
                  </div>
                )}
                {threadSummary.nextStep && (
                  <div>
                    <h4 className="font-semibold text-indigo-400 mb-1">NEXT SUGGESTED STEP</h4>
                    <p className="text-[#A0A0A0]">{threadSummary.nextStep}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chronological Conversation Thread Messages */}
          <div className="space-y-4">
            {threadMessages.map((msg, index) => {
              const isExpanded = expandedMessageIds.has(msg.id);
              const formattedMsgDate = isNaN(new Date(msg.date).getTime())
                ? msg.date
                : format(new Date(msg.date), 'EEE, MMM d, yyyy @ h:mm a');

              const sanitizedMsgHtml = sanitizeHtml(msg.bodyHtml || msg.bodyText, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style', 'h1', 'h2', 'h3', 'hr', 'blockquote']),
                allowedAttributes: {
                  '*': ['style', 'class', 'id'],
                  a: ['href', 'target'],
                  img: ['src', 'alt', 'width', 'height'],
                },
              });

              return (
                <div
                  key={msg.id}
                  className="rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] overflow-hidden shadow-lg transition"
                >
                  {/* Message Header (Clickable for Collapse/Expand) */}
                  <div
                    onClick={() => toggleMessageExpansion(msg.id)}
                    className="p-4 bg-[#0A0A0A] hover:bg-[#121212] cursor-pointer flex items-center justify-between border-b border-[#2A2A2A]/50 select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] flex items-center justify-center font-bold text-xs shrink-0">
                        {msg.from.name ? msg.from.name[0].toUpperCase() : 'U'}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold text-white">{msg.from.name || msg.from.email}</h3>
                          <span className="text-[11px] text-[#A0A0A0] font-mono">&lt;{msg.from.email}&gt;</span>
                        </div>
                        <p className="text-[11px] text-[#888888] line-clamp-1">
                          To: {msg.to.map(t => t.name || t.email).join(', ')}
                          {!isExpanded && ` — ${msg.snippet}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {msg.hasAttachment && (
                        <div className="flex items-center space-x-1 text-xs text-[#A0A0A0]" title="Contains attachment">
                          <Paperclip className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="text-[11px] text-[#888888] font-mono">{formattedMsgDate}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#A0A0A0]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Message Content */}
                  {isExpanded && (
                    <div className="p-6 space-y-4 bg-[#070707]">
                      {/* Body */}
                      <div className="text-neutral-200 text-xs leading-relaxed overflow-x-auto min-h-[100px]">
                        {showRawText ? (
                          <pre className="whitespace-pre-wrap font-mono text-xs text-[#A0A0A0]">{msg.bodyText}</pre>
                        ) : (
                          <div
                            className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-[#FF1A1A]"
                            dangerouslySetInnerHTML={{ __html: sanitizedMsgHtml }}
                          />
                        )}
                      </div>

                      {/* Attachments List */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-3 border-t border-[#2A2A2A] space-y-2">
                          <span className="text-xs font-medium text-[#A0A0A0] flex items-center space-x-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Attachments ({msg.attachments.length})</span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map(att => (
                              <div
                                key={att.id}
                                className="px-3 py-1.5 rounded-lg bg-[#151515] border border-[#2A2A2A] text-xs text-white flex items-center space-x-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#E50914]" />
                                <span className="font-medium truncate max-w-[180px]">{att.filename}</span>
                                <span className="text-[10px] text-[#888888]">
                                  ({Math.round(att.size / 1024)} KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Toolbar */}
                      <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleStartReply('reply', msg)}
                            className="px-3 py-1 rounded-lg bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] border border-[#2A2A2A] flex items-center space-x-1.5"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                          <button
                            onClick={() => handleStartReply('replyAll', msg)}
                            className="px-3 py-1 rounded-lg bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] border border-[#2A2A2A] flex items-center space-x-1.5"
                          >
                            <Users className="w-3 h-3" />
                            <span>Reply All</span>
                          </button>
                        </div>
                        <button
                          onClick={() => setShowRawText(!showRawText)}
                          className="text-[11px] text-[#888888] hover:text-white"
                        >
                          {showRawText ? 'Show HTML' : 'Show Text'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Reply Editor */}
          {isReplyOpen && (
            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1 border ${
                    replyMode === 'aiReply'
                      ? 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]/30'
                      : 'bg-[#151515] text-[#A0A0A0] border-[#2A2A2A]'
                  }`}>
                    {replyMode === 'aiReply' ? <Sparkles className="w-3 h-3 text-[#E50914]" /> : <Reply className="w-3 h-3" />}
                    <span>{replyMode === 'aiReply' ? 'AI Reply Editor' : replyMode === 'replyAll' ? 'Reply All Editor' : 'Reply Editor'}</span>
                  </span>
                  <span className="text-xs text-[#666666]">Re: {email.subject}</span>
                </div>

                <button
                  onClick={handleCancelReply}
                  className="p-1 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#151515] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tone Selection Chips */}
              {replyMode === 'aiReply' && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-xs text-[#A0A0A0] font-medium mr-1">Tone:</span>
                  {aiModeOptions.map(opt => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => handleModeChange(opt.mode)}
                      disabled={isGeneratingAI || isSending}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition shrink-0 border flex items-center space-x-1 ${
                        aiMode === opt.mode
                          ? 'bg-[#E50914] text-white border-[#E50914]'
                          : 'bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] border-[#2A2A2A]'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="min-h-[160px]">
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Review and edit your response here before sending..."
                  className="w-full h-40 bg-[#050505] border border-[#2A2A2A] rounded-xl p-3.5 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#E50914] leading-relaxed resize-y"
                  disabled={isGeneratingAI || isSending}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
                <div>
                  {replyMode === 'aiReply' && (
                    <button
                      type="button"
                      onClick={() => runAIGeneration(aiMode)}
                      disabled={isGeneratingAI || isSending}
                      className="px-3 py-1.5 rounded-lg bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020] text-xs font-medium flex items-center space-x-1.5 border border-[#2A2A2A] transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin text-[#E50914]' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={handleCancelReply}
                    disabled={isSending}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white hover:bg-[#151515] transition border border-[#2A2A2A]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isGeneratingAI || isSending || !replyBody.trim()}
                    className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-[#E50914]/20 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible AI Side Panel */}
        <AIContextPanel
          email={email}
          onSelectAIReplyMode={(mode) => {
            setAiMode(mode);
            handleStartReply('aiReply');
          }}
          onDraftMeetingResponse={(date, time) => {
            setReplyBody(`Hi ${email.from.name || 'there'},\n\nThanks for proposing to meet${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}. That works great for me. Looking forward to our conversation.\n\nBest regards,`);
            setIsReplyOpen(true);
          }}
        />
      </div>

      {/* Permanent Delete Modal */}
      {showPermDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0A0A0A] border border-[#E50914]/40 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-[#FF1A1A]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Permanently Delete Email?</h3>
            </div>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              This message will be permanently removed from your Gmail account. This action <strong className="text-white">cannot be undone</strong>.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowPermDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white hover:bg-[#151515] transition border border-[#2A2A2A]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold shadow-lg shadow-[#E50914]/30 transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
