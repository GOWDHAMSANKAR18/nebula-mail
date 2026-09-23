'use client';

import React from 'react';
import { RotateCcw, Send, CheckCircle2 } from 'lucide-react';

interface UndoSendToastProps {
  recipient: string;
  countdownSeconds: number;
  onUndo: () => void;
}

export function UndoSendToast({
  recipient,
  countdownSeconds,
  onUndo,
}: UndoSendToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F0D15] border border-indigo-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold shrink-0">
        {countdownSeconds}s
      </div>

      <div className="text-xs">
        <p className="font-semibold text-white">Sending email to {recipient}...</p>
        <p className="text-[11px] text-[#A0A0A0]">Click Undo within {countdownSeconds} seconds to cancel sending.</p>
      </div>

      <button
        onClick={onUndo}
        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 active:scale-[0.98] transition"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Undo Send</span>
      </button>
    </div>
  );
}
