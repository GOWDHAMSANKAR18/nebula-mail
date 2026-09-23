'use client';

import React from 'react';
import { ListChecks, CheckCircle2, Circle, ArrowRight, X, Play } from 'lucide-react';

export interface PlanStep {
  title: string;
  description?: string;
  status: 'pending' | 'executing' | 'completed' | 'cancelled';
}

interface AIPlanCardProps {
  planTitle?: string;
  steps: PlanStep[];
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function AIPlanCard({
  planTitle = 'AI Multi-Step Execution Plan',
  steps,
  onConfirm,
  onCancel,
  isExecuting = false,
}: AIPlanCardProps) {
  return (
    <div className="my-3 p-4 rounded-xl bg-[#0D0D1A] border border-indigo-500/40 shadow-xl space-y-3">
      {/* Plan Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <ListChecks className="w-4 h-4 text-indigo-400" />
          <span>{planTitle}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
          Requires Approval
        </span>
      </div>

      {/* Plan Steps */}
      <div className="space-y-2 text-xs">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start space-x-2.5 text-neutral-200">
            {step.status === 'completed' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
            ) : step.status === 'executing' ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mt-0.5 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-[#666666] mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${step.status === 'completed' ? 'text-emerald-300 line-through opacity-75' : 'text-white'}`}>
                {step.title}
              </p>
              {step.description && (
                <p className="text-[11px] text-[#A0A0A0] mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-indigo-500/20">
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#202020] text-[#A0A0A0] hover:text-white border border-[#2A2A2A] text-xs font-medium transition disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          onClick={onConfirm}
          disabled={isExecuting}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>{isExecuting ? 'Executing Plan...' : 'Continue & Execute'}</span>
        </button>
      </div>
    </div>
  );
}
