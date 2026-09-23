'use client';

import React from 'react';
import { FollowUpItem } from '@/types/email';
import { Clock, Send, Bell, X, AlertCircle } from 'lucide-react';

interface FollowUpCardProps {
  item: FollowUpItem;
  onDraftFollowUp: (item: FollowUpItem) => void;
  onRemindMe?: (item: FollowUpItem) => void;
  onDismiss: (itemId: string) => void;
}

export function FollowUpCard({
  item,
  onDraftFollowUp,
  onRemindMe,
  onDismiss,
}: FollowUpCardProps) {
  return (
    <div className="my-2 p-3.5 rounded-xl bg-[#140F0A] border border-amber-500/30 text-xs space-y-2.5 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <Clock className="w-3.5 h-3.5" />
          <span>FOLLOW-UP ASSISTANT</span>
        </div>
        <button
          onClick={() => onDismiss(item.id)}
          className="text-[#888888] hover:text-white p-0.5 rounded transition"
          title="Dismiss follow-up"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Reason text */}
      <p className="text-white font-medium leading-relaxed">&quot;{item.reason}&quot;</p>

      {/* Sender & date metadata */}
      <div className="flex items-center space-x-2 text-[11px] text-[#A0A0A0]">
        <span>From: <strong className="text-neutral-300">{item.fromName}</strong></span>
        <span>•</span>
        <span>{item.date}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          onClick={() => onDraftFollowUp(item)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold flex items-center space-x-1.5 transition text-[11px] shadow-sm"
        >
          <Send className="w-3 h-3" />
          <span>Draft Follow-up</span>
        </button>

        {onRemindMe && (
          <button
            onClick={() => onRemindMe(item)}
            className="px-3 py-1.5 rounded-lg bg-[#1F1A14] hover:bg-[#2A231B] text-amber-300 border border-amber-500/30 font-medium flex items-center space-x-1.5 transition text-[11px]"
          >
            <Bell className="w-3 h-3" />
            <span>Remind Me</span>
          </button>
        )}

        <button
          onClick={() => onDismiss(item.id)}
          className="px-2.5 py-1.5 rounded-lg bg-[#151515] hover:bg-[#202020] text-[#A0A0A0] hover:text-white border border-[#2A2A2A] transition text-[11px]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
