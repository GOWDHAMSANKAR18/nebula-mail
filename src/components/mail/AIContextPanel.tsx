'use client';

import React, { useState, useEffect } from 'react';
import {
  ThreadSummary,
  ActionItem,
  MeetingInfo,
  AIReplyMode,
  EmailMessage,
} from '@/types/email';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Calendar,
  AlertCircle,
  HelpCircle,
  FileText,
  Send,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface AIContextPanelProps {
  email: EmailMessage;
  onSelectAIReplyMode: (mode: AIReplyMode, customPrompt?: string) => void;
  onDraftMeetingResponse?: (date?: string, time?: string) => void;
  onCreateTaskConfirm?: (task: ActionItem) => void;
}

export function AIContextPanel({
  email,
  onSelectAIReplyMode,
  onDraftMeetingResponse,
  onCreateTaskConfirm,
}: AIContextPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [whyItMatters, setWhyItMatters] = useState<string | null>(null);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);

  const [selectedMode, setSelectedMode] = useState<AIReplyMode>('detailed');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: email.threadId,
          messageId: email.id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to load AI insights.');
      }

      const data = await res.json();
      setWhyItMatters(data.whyItMatters || null);
      setSummary(data.summary || null);
      setActionItems(data.actionItems || []);
      setMeetingInfo(data.meetingInfo || null);
    } catch (err: any) {
      setError(err?.message || 'Could not fetch insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [email.id, email.threadId]);

  const handleApplyMode = (mode: AIReplyMode) => {
    setSelectedMode(mode);
    if (mode === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      onSelectAIReplyMode(mode);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      onSelectAIReplyMode('custom', customPrompt.trim());
    }
  };

  return (
    <div className="w-80 border-l border-[#2a2a2a] bg-[#0a0a0a] flex flex-col h-full shrink-0 overflow-y-auto text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between bg-[#111111] sticky top-0 z-10">
        <div className="flex items-center space-x-2 text-[#E50914]">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wide text-white">AI Insights</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#202020] transition"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Refresh / Status */}
          <div className="flex items-center justify-between text-xs text-[#888888]">
            <span>Thread Analysis</span>
            <button
              onClick={fetchInsights}
              disabled={isLoading}
              className="flex items-center space-x-1 hover:text-[#E50914] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-[#151515] rounded-xl border border-[#2a2a2a]" />
              <div className="h-24 bg-[#151515] rounded-xl border border-[#2a2a2a]" />
              <div className="h-16 bg-[#151515] rounded-xl border border-[#2a2a2a]" />
            </div>
          ) : error ? (
            <div className="p-3 bg-[#E50914]/10 border border-[#E50914]/20 rounded-xl text-xs text-[#E50914] flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* 1. Why This Matters */}
              {whyItMatters && (
                <div className="p-3.5 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#E50914]">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why This Matters</span>
                  </div>
                  <p className="text-xs text-[#D0D0D0] leading-relaxed">{whyItMatters}</p>
                </div>
              )}

              {/* 2. Smart Thread Summary */}
              {summary && (
                <div className="p-3.5 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                    <FileText className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>Thread Summary</span>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-[#888888] font-medium block">Topic</span>
                      <p className="text-white font-medium">{summary.topic}</p>
                    </div>

                    {(summary.keyPoints?.length ?? 0) > 0 && (
                      <div>
                        <span className="text-[#888888] font-medium block">Key Points</span>
                        <ul className="list-disc list-inside text-[#B0B0B0] space-y-0.5 mt-0.5">
                          {summary.keyPoints?.map((kp, idx) => (
                            <li key={idx} className="truncate">{kp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(summary.decisions?.length ?? 0) > 0 && (
                      <div>
                        <span className="text-[#888888] font-medium block">Decisions</span>
                        <ul className="list-disc list-inside text-[#4ADE80] space-y-0.5 mt-0.5">
                          {summary.decisions?.map((d, idx) => (
                            <li key={idx} className="truncate">{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(summary.openQuestions?.length ?? 0) > 0 && (
                      <div>
                        <span className="text-[#888888] font-medium block">Open Questions</span>
                        <ul className="list-disc list-inside text-[#FBBF24] space-y-0.5 mt-0.5">
                          {summary.openQuestions?.map((q, idx) => (
                            <li key={idx} className="truncate">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Action Items */}
              {actionItems.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <div className="flex items-center space-x-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#E50914]" />
                      <span>Extracted Action Items</span>
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] px-2 py-0.5 rounded bg-[#202020]">
                      {actionItems.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {actionItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#202020] border border-[#2a2a2a] space-y-1 text-xs">
                        <div className="flex items-start justify-between">
                          <p className="text-white font-medium">{item.task || item.description}</p>
                          <button
                            onClick={() => setActionItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-[#666666] hover:text-[#E50914] text-[10px] ml-1 shrink-0"
                            title="Dismiss item"
                          >
                            ✕
                          </button>
                        </div>
                        {item.owner && (
                          <p className="text-[10px] text-[#A0A0A0]">Owner: <span className="text-neutral-300">{item.owner}</span></p>
                        )}
                        {item.deadline && (
                          <p className="text-[10px] text-[#FBBF24] font-medium">Deadline: {item.deadline}</p>
                        )}
                        {item.evidence && (
                          <p className="text-[10px] text-[#888888] italic truncate" title={item.evidence}>Evidence: &quot;{item.evidence}&quot;</p>
                        )}
                        <button
                          onClick={() => onCreateTaskConfirm && onCreateTaskConfirm(item)}
                          className="mt-1.5 w-full py-1 bg-[#E50914]/20 hover:bg-[#E50914] text-[#E50914] hover:text-white text-[10px] font-semibold rounded transition"
                        >
                          + Create Task
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Meeting Intelligence */}
              {meetingInfo && (
                <div className="p-3.5 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#38BDF8]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Meeting Proposal Detected</span>
                  </div>
                  <div className="text-xs space-y-1 text-[#D0D0D0]">
                    {meetingInfo.date && <p><span className="text-[#888888]">Date:</span> {meetingInfo.date}</p>}
                    {meetingInfo.time && <p><span className="text-[#888888]">Time:</span> {meetingInfo.time}</p>}
                    {meetingInfo.purpose && <p><span className="text-[#888888]">Purpose:</span> {meetingInfo.purpose}</p>}
                  </div>
                  <button
                    onClick={() => onDraftMeetingResponse && onDraftMeetingResponse(meetingInfo.date, meetingInfo.time)}
                    className="w-full py-1.5 bg-[#38BDF8]/20 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-black text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Draft Confirmation</span>
                  </button>
                </div>
              )}

              {/* 5. Selectable AI Reply Modes */}
              <div className="p-3.5 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>AI Reply Modes</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    { id: 'detailed', label: '📝 Detailed', desc: 'Complete, structured reply with full context & explanation' },
                    { id: 'brief', label: '⚡ Brief', desc: 'Short, direct reply with only key information' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => handleApplyMode(mode.id as AIReplyMode)}
                      className={`p-2.5 rounded-xl text-left font-medium transition border ${
                        selectedMode === mode.id
                          ? 'bg-[#E50914] text-white border-[#E50914]'
                          : 'bg-[#202020] text-[#D0D0D0] border-[#2a2a2a] hover:border-[#444444]'
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className="text-[10px] text-[#A0A0A0] mt-0.5 leading-snug">{mode.desc}</div>
                    </button>
                  ))}
                </div>

                {showCustomInput && (
                  <form onSubmit={handleCustomSubmit} className="space-y-2 mt-2">
                    <textarea
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Tell them I need two more days, but keep it polite..."
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#E50914] placeholder-[#666666]"
                    />
                    <button
                      type="submit"
                      disabled={!customPrompt.trim()}
                      className="w-full py-1.5 bg-[#E50914] hover:bg-[#FF1A1A] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Generate Custom Reply</span>
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
