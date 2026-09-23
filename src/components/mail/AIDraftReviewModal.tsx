'use client';

import React, { useState } from 'react';
import { DraftReviewResult } from '@/types/email';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Lightbulb, X, Sparkles } from 'lucide-react';

interface AIDraftReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftBody: string;
  threadId?: string;
  messageId?: string;
  onApplySuggestions?: (modifiedDraft: string) => void;
}

export function AIDraftReviewModal({
  isOpen,
  onClose,
  draftBody,
  threadId,
  messageId,
  onApplySuggestions,
}: AIDraftReviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [review, setReview] = useState<DraftReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && draftBody) {
      runAudit();
    }
  }, [isOpen, draftBody]);

  const runAudit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftBody, threadId, messageId }),
      });

      if (!res.ok) {
        throw new Error('Failed to complete AI Draft Review.');
      }

      const data = await res.json();
      setReview(data.review);
    } catch (err: any) {
      setError(err?.message || 'Could not audit draft.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#151515] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base font-bold text-white">Review Draft with AI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-[#202020] text-[#888888] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Sparkles className="w-8 h-8 text-[#E50914] animate-spin" />
              <p className="text-sm font-semibold text-white">Auditing email draft safety & clarity...</p>
              <p className="text-xs text-[#888888]">Checking for unanswered questions, accidental commitments & tone issues.</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#E50914]/10 border border-[#E50914]/20 text-xs text-[#E50914]">
              {error}
            </div>
          ) : review ? (
            <>
              {/* Overall Assessment */}
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  review.isGoodToSend
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#4ADE80]'
                    : 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FBBF24]'
                }`}
              >
                {review.isGoodToSend ? (
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {review.isGoodToSend ? 'Draft Looks Good to Send' : 'Draft Requires Attention'}
                  </h4>
                  <p className="text-xs mt-1 text-[#D0D0D0] leading-relaxed">{review.summary}</p>
                </div>
              </div>

              {/* Unanswered Questions */}
              {review.unansweredQuestions?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#FBBF24]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Unanswered Questions from Thread</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#D0D0D0] space-y-1">
                    {review.unansweredQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unsupported Claims */}
              {review.unsupportedClaims?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#E50914]">
                    <XCircle className="w-4 h-4" />
                    <span>Unsupported Claims Detected</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#D0D0D0] space-y-1">
                    {review.unsupportedClaims.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Accidental Commitments */}
              {review.accidentalCommitments?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#38BDF8]">
                    <Lightbulb className="w-4 h-4" />
                    <span>Accidental Commitments or Promises</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#D0D0D0] space-y-1">
                    {review.accidentalCommitments.map((ac, idx) => (
                      <li key={idx}>{ac}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths */}
              {review.strengths?.length > 0 && (
                <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#4ADE80]">
                    <CheckCircle className="w-4 h-4" />
                    <span>Positive Attributes</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#D0D0D0] space-y-1">
                    {review.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#151515] flex items-center justify-between">
          <p className="text-[11px] text-[#888888]">AI suggestions are advisory. You retain full control over sending.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold shadow transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
