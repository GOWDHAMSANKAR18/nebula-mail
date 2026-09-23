'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Send, Sparkles, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { AIDraftReviewModal } from './AIDraftReviewModal';

export function ComposeDrawer() {
  const { state, closeCompose, sendEmailAction, saveDraftAction, setComposeDraft, isLoading } = useApp();
  const draft = state.composeDraft;

  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    if (draft) {
      setTo(draft.to || '');
      setCc(draft.cc || '');
      setSubject(draft.subject || '');
      setBody(draft.body || '');
    }
  }, [draft]);

  if (!state.isComposeOpen) {
    return null;
  }

  const handleFieldChange = (field: 'to' | 'cc' | 'subject' | 'body', val: string) => {
    if (field === 'to') setTo(val);
    if (field === 'cc') setCc(val);
    if (field === 'subject') setSubject(val);
    if (field === 'body') setBody(val);

    setComposeDraft({
      ...draft,
      to: field === 'to' ? val : to,
      cc: field === 'cc' ? val : cc,
      subject: field === 'subject' ? val : subject,
      body: field === 'body' ? val : body,
    });
  };

  const handleSmartCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const isReply = Boolean(draft?.isReply || draft?.replyToId || draft?.threadId);

      if (isReply) {
        // Use /api/ai/reply for existing messages/threads
        const res = await fetch('/api/ai/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'custom',
            customInstruction: smartPrompt,
            messageId: draft?.replyToId,
            threadId: draft?.threadId,
            profile: state.selectedProfile || 'professional',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `AI Reply failed with status ${res.status}`);
        }

        if (data.reply) {
          handleFieldChange('body', data.reply);
          setShowSmartInput(false);
        }
      } else {
        // Use /api/ai/compose for NEW email composition
        const res = await fetch('/api/ai/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'custom',
            customInstruction: smartPrompt,
            prompt: smartPrompt,
            profile: state.selectedProfile || 'professional',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `AI Compose failed with status ${res.status}`);
        }

        if (data.subject || data.body) {
          if (data.subject) handleFieldChange('subject', data.subject);
          if (data.body) handleFieldChange('body', data.body);
          setShowSmartInput(false);
        }
      }
    } catch (err: any) {
      console.error('Smart compose error:', err);
      setErrorMsg(err.message || 'Failed to generate AI content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setIsSavingDraft(true);
    try {
      await saveDraftAction({
        ...draft,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save draft to Gmail.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      setErrorMsg('Please specify a recipient email address.');
      return;
    }

    setErrorMsg(null);
    await sendEmailAction({
      ...draft,
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      body: body.trim(),
    });
  };

  return (
    <div className="fixed bottom-0 right-8 z-50 w-full max-w-xl bg-[#0A0A0A] border border-[#2A2A2A] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#151515] border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[#E50914]/20 text-[#E50914] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-white">
            {draft?.isReply ? 'Reply Message' : 'New Message'}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowSmartInput(!showSmartInput)}
            className="px-2.5 py-1 rounded-lg bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] hover:bg-[#E50914] hover:text-white text-xs font-semibold flex items-center space-x-1 transition"
          >
            <Sparkles className="w-3 h-3" />
            <span>Help me write</span>
          </button>
          <button
            onClick={closeCompose}
            className="text-[#A0A0A0] hover:text-white p-1 rounded-lg hover:bg-[#202020] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Smart Compose Prompt Drawer */}
      {showSmartInput && (
        <form onSubmit={handleSmartCompose} className="p-3 bg-[#151515] border-b border-[#2a2a2a] flex items-center space-x-2">
          <input
            type="text"
            value={smartPrompt}
            onChange={e => setSmartPrompt(e.target.value)}
            placeholder={draft?.isReply ? 'e.g. Write a friendly acceptance reply...' : 'e.g. Please prepare a draft email to my project team about tomorrow’s meeting...'}
            className="flex-1 bg-[#0a0a0a] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#E50914]"
          />
          <button
            type="submit"
            disabled={isGenerating || !smartPrompt.trim()}
            className="px-3 py-1.5 bg-[#E50914] hover:bg-[#FF1A1A] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shrink-0"
          >
            {isGenerating ? 'Drafting...' : 'Generate Draft'}
          </button>
        </form>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 flex flex-col">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#E50914]/10 border border-[#E50914]/30 text-[#FF1A1A] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Recipient */}
        <div className="flex items-center space-x-3 border-b border-[#2A2A2A] pb-2">
          <label className="text-xs font-medium text-[#A0A0A0] w-14">To:</label>
          <input
            type="email"
            value={to}
            onChange={e => handleFieldChange('to', e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
            required
          />
        </div>

        {/* CC */}
        {(cc || draft?.replyMode === 'replyAll') && (
          <div className="flex items-center space-x-3 border-b border-[#2A2A2A] pb-2">
            <label className="text-xs font-medium text-[#A0A0A0] w-14">Cc:</label>
            <input
              type="text"
              value={cc}
              onChange={e => handleFieldChange('cc', e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center space-x-3 border-b border-[#2A2A2A] pb-2">
          <label className="text-xs font-medium text-[#A0A0A0] w-14">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={e => handleFieldChange('subject', e.target.value)}
            placeholder="Subject line..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
          />
        </div>

        {/* Body Textarea */}
        <div className="flex-1 min-h-[180px] pt-1">
          <textarea
            value={body}
            onChange={e => handleFieldChange('body', e.target.value)}
            placeholder="Write your email here or ask AI Copilot to draft it for you..."
            className="w-full h-full min-h-[160px] bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* AI Tone & Refinement Controls */}
        {body.trim().length > 10 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-[#A0A0A0] font-medium mr-1 flex items-center space-x-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#E50914]" />
              <span>Refine:</span>
            </span>
            {[
              { label: 'Professional', mode: 'professional' },
              { label: 'Friendly', mode: 'friendly' },
              { label: 'Concise', mode: 'concise' },
              { label: 'Shorten', mode: 'shorten' },
              { label: 'Expand', mode: 'expand' },
            ].map(opt => (
              <button
                key={opt.mode}
                type="button"
                disabled={isGenerating}
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const res = await fetch('/api/ai/compose', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: `Rewrite the following email draft to be ${opt.label.toLowerCase()}:\n\n${body}`,
                        mode: opt.mode,
                      }),
                    });
                    const data = await res.json();
                    if (data.body) handleFieldChange('body', data.body);
                  } catch (e) {
                    console.error('Refine error:', e);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                className="px-2.5 py-0.5 rounded-full bg-[#151515] hover:bg-[#202020] text-[#A0A0A0] hover:text-white border border-[#2A2A2A] transition shrink-0 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Footer Controls */}
        <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={closeCompose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white hover:bg-[#151515] transition"
            >
              Cancel
            </button>

            {body.trim().length > 10 && (
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#202020] hover:bg-[#252525] text-white text-xs font-semibold flex items-center space-x-1.5 border border-[#333333] transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#E50914]" />
                <span>Review with AI</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isLoading}
              className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#2A2A2A] text-white font-semibold text-xs transition disabled:opacity-50 border border-[#3A3A3A]"
            >
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              type="submit"
              disabled={isLoading || isSavingDraft}
              className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-[#E50914]/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <AIDraftReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        draftBody={body}
        threadId={draft?.threadId}
        messageId={draft?.replyToId}
      />
    </div>
  );
}


