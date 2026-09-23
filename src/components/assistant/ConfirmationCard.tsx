'use client';

import React from 'react';
import { ComposeDraft } from '@/types/email';
import { Send, AlertTriangle } from 'lucide-react';

interface ConfirmationCardProps {
  draft: ComposeDraft;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationCard({ draft, onConfirm, onCancel }: ConfirmationCardProps) {
  return (
    <div className="my-3 p-4 rounded-xl bg-[#0A0A0A] border border-[#E50914]/50 shadow-lg space-y-3">
      {/* Warning Header */}
      <div className="flex items-center space-x-2 text-[#E50914]">
        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
        <h4 className="text-xs font-bold uppercase tracking-wider">Human Confirmation Required</h4>
      </div>

      <p className="text-xs text-[#A0A0A0] leading-relaxed">
        The AI copilot prepared this draft. Please review details before sending to Gmail.
      </p>

      {/* Details Box */}
      <div className="p-3 rounded-lg bg-[#050505] border border-[#2A2A2A] space-y-1.5 text-xs">
        <div className="flex items-center text-[#A0A0A0]">
          <span className="w-16 font-medium text-[#666666]">To:</span>
          <span className="text-white font-mono font-semibold">{draft.to}</span>
        </div>
        <div className="flex items-center text-[#A0A0A0]">
          <span className="w-16 font-medium text-[#666666]">Subject:</span>
          <span className="text-white">{draft.subject || '(No Subject)'}</span>
        </div>
        <div className="pt-1.5 border-t border-[#2A2A2A] text-neutral-200 line-clamp-2">
          {draft.body}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-2.5 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#202020] text-[#A0A0A0] hover:text-white text-xs font-medium transition border border-[#2A2A2A]"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Confirm & Send</span>
        </button>
      </div>
    </div>
  );
}
