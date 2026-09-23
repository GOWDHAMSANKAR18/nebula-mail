'use client';

import React from 'react';
import { AssistantMessage as AssistantMessageType } from '@/types/assistant';
import { useApp } from '@/context/AppContext';
import { ConfirmationCard } from './ConfirmationCard';
import { EmailPreviewCard } from './EmailPreviewCard';
import { ToolExecutionCard } from './ToolExecutionCard';
import { AIPlanCard } from './AIPlanCard';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface AssistantMessageProps {
  message: AssistantMessageType;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const { confirmPendingSend, cancelPendingSend } = useApp();

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="my-2 p-2.5 rounded-lg bg-[#E50914]/10 border border-[#E50914]/30 text-[#FF1A1A] text-xs text-center flex items-center justify-center space-x-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#E50914]" />
        <span>{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 my-3 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Sender Avatar & Role Badge */}
      <div className="flex items-center space-x-2">
        {!isUser && (
          <div className="w-5 h-5 rounded-md bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] shadow-sm">
            <Sparkles className="w-3 h-3" />
          </div>
        )}
        <span className="text-[11px] font-semibold text-[#A0A0A0]">
          {isUser ? 'You' : 'Nebula Copilot'}
        </span>
        <span className="text-[10px] text-[#666666] font-mono">{message.timestamp}</span>
      </div>

      {/* Message Bubble Container */}
      <div
        className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
          isUser
            ? 'bg-[#E50914] text-white rounded-tr-xs'
            : 'bg-[#151515] border border-[#2A2A2A] text-white rounded-tl-xs'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* AI Multi-Step Plan Preview Card */}
        {message.planSteps && message.planSteps.length > 0 && (
          <AIPlanCard
            steps={message.planSteps}
            onConfirm={() => {
              // Execute remaining plan tool calls
            }}
            onCancel={() => {
              // Cancel plan
            }}
          />
        )}

        {/* Phase 2 Rich Tool Execution Result Cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolCalls.map(tc => (
              <ToolExecutionCard key={tc.id} msgId={message.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Embedded Email Preview Cards */}
        {message.emailPreviews && message.emailPreviews.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.emailPreviews.map(email => (
              <EmailPreviewCard key={email.id} email={email} />
            ))}
          </div>
        )}

        {/* Pending Human Confirmation UI Card */}
        {message.pendingConfirmation && (
          <ConfirmationCard
            draft={message.pendingConfirmation.draft}
            onConfirm={confirmPendingSend}
            onCancel={cancelPendingSend}
          />
        )}
      </div>
    </div>
  );
}
