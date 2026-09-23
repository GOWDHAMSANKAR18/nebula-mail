'use client';

import React, { useState } from 'react';
import { AssistantToolCall } from '@/types/assistant';
import { useApp } from '@/context/AppContext';
import { Search, PenSquare, Mail, Send, Reply, Filter, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface ToolExecutionCardProps {
  msgId: string;
  toolCall: AssistantToolCall;
}

export function ToolExecutionCard({ msgId, toolCall }: ToolExecutionCardProps) {
  const { openCompose, openEmailDetail, setFolder, retryToolExecution } = useApp();
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const isCompleted = toolCall.status === 'completed';
  const isExecuting = toolCall.status === 'executing' || toolCall.status === 'pending';
  const isFailed = toolCall.status === 'failed';
  const isConfirmation = toolCall.status === 'requires_confirmation';

  // Tool specific metadata
  const getToolIcon = () => {
    switch (toolCall.name) {
      case 'searchEmails': return <Search className="w-3.5 h-3.5 text-[#E50914]" />;
      case 'openCompose':
      case 'fillCompose': return <PenSquare className="w-3.5 h-3.5 text-[#E50914]" />;
      case 'openEmail': return <Mail className="w-3.5 h-3.5 text-[#E50914]" />;
      case 'sendEmail': return <Send className="w-3.5 h-3.5 text-emerald-400" />;
      case 'replyToEmail':
      case 'forwardEmail': return <Reply className="w-3.5 h-3.5 text-[#E50914]" />;
      case 'applyFilter':
      case 'navigateTo': return <Filter className="w-3.5 h-3.5 text-[#E50914]" />;
      default: return <Search className="w-3.5 h-3.5 text-[#A0A0A0]" />;
    }
  };

  const getToolTitle = () => {
    switch (toolCall.name) {
      case 'searchEmails': return 'Search Emails';
      case 'openCompose': return 'Open Compose';
      case 'fillCompose': return 'Prepare Draft';
      case 'openEmail': return 'Open Email';
      case 'sendEmail': return 'Send Email';
      case 'replyToEmail': return 'Reply to Email';
      case 'forwardEmail': return 'Forward Email';
      case 'applyFilter': return 'Apply Filter';
      case 'navigateTo': return 'Navigate View';
      default: return toolCall.name;
    }
  };

  const getActionReason = () => {
    switch (toolCall.name) {
      case 'searchEmails':
        if (toolCall.args.sort === 'oldest') {
          return `Retrieved inbox emails and sorted them from oldest to newest.`;
        }
        if (toolCall.args.sort === 'newest') {
          return `Retrieved inbox emails sorted by newest first.`;
        }
        if (toolCall.args.unreadOnly) {
          return `Retrieved unread emails from your inbox.`;
        }
        if (toolCall.args.hasAttachment) {
          return `Retrieved emails containing attachments.`;
        }
        return `Filtered emails based on request (${toolCall.args.query || toolCall.args.from || 'specified parameters'}).`;
      case 'openEmail':
        return `Opened matching email (ID: ${toolCall.args.messageId}) for detailed view.`;
      case 'openCompose':
      case 'fillCompose':
        return `Prepared compose draft for recipient ${toolCall.args.to || 'specified recipient'}.`;
      case 'sendEmail':
        return `Request to send email to ${toolCall.args.to} with subject "${toolCall.args.subject}".`;
      case 'replyToEmail':
        return `Prepared response to active conversation thread.`;
      default:
        return `Executed UI tool call for ${toolCall.name}.`;
    }
  };

  const formatArgs = () => {
    if (!toolCall.args || Object.keys(toolCall.args).length === 0) return 'None';
    return Object.entries(toolCall.args)
      .map(([k, v]) => `${k} = ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(', ');
  };

  const getResultSummary = () => {
    if (toolCall.result?.count !== undefined) return `${toolCall.result.count} matching emails`;
    if (toolCall.result?.sent) return 'Email successfully sent';
    if (toolCall.result?.success) return 'Action completed successfully';
    if (isCompleted) return 'Completed successfully';
    if (isFailed) return toolCall.error || 'Execution failed';
    return 'Pending execution';
  };

  return (
    <div className="my-2 p-3.5 rounded-xl bg-[#050505] border border-[#2A2A2A] shadow-md space-y-2 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-[#151515] border border-[#2A2A2A]">
            {getToolIcon()}
          </div>
          <span className="font-semibold text-white">{getToolTitle()}</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-[#888888] hover:text-white transition flex items-center space-x-1 underline decoration-dotted"
          >
            <span>Show details</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isExecuting && (
            <span className="px-2 py-0.5 rounded-full bg-[#E50914]/10 text-[#FF1A1A] border border-[#E50914]/30 text-[10px] font-mono flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Executing...</span>
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completed</span>
            </span>
          )}
          {isConfirmation && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 animate-pulse" />
              <span>Confirmation Needed</span>
            </span>
          )}
          {isFailed && (
            <span className="px-2 py-0.5 rounded-full bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/30 text-[10px] font-mono flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>Failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      {isCompleted && toolCall.name === 'searchEmails' && (
        <div className="text-[#A0A0A0] space-y-1">
          <p className="font-medium text-white">
            Found {toolCall.result?.count ?? 0} matching emails.
          </p>
          {toolCall.args.from && <p className="text-[#666666] text-[11px]">From: {toolCall.args.from}</p>}
          {toolCall.args.startDate && <p className="text-[#666666] text-[11px]">After: {toolCall.args.startDate}</p>}
        </div>
      )}

      {isCompleted && (toolCall.name === 'openCompose' || toolCall.name === 'fillCompose') && (
        <div className="text-[#A0A0A0] space-y-0.5 font-mono text-[11px]">
          <p><span className="text-[#666666]">To:</span> {toolCall.args.to || '(empty)'}</p>
          <p><span className="text-[#666666]">Subject:</span> {toolCall.args.subject || '(No Subject)'}</p>
        </div>
      )}

      {isCompleted && toolCall.name === 'openEmail' && (
        <div className="text-[#A0A0A0] text-[11px]">
          <p className="font-medium text-white">Navigated to Email ID: {toolCall.args.messageId}</p>
        </div>
      )}

      {isFailed && (
        <div className="p-2 rounded bg-[#E50914]/10 border border-[#E50914]/30 text-[#FF1A1A] text-[11px]">
          <p>{toolCall.error || 'Tool execution timed out or failed.'}</p>
        </div>
      )}

      {/* Expandable Action Trace Details (Why did the assistant do this?) */}
      {showDetails && (
        <div className="p-3 rounded-lg bg-[#0E0E0E] border border-[#222222] space-y-1.5 text-[11px] font-mono text-[#D0D0D0] mt-2">
          <div className="flex items-center space-x-1 text-amber-400 font-bold text-[10px] uppercase tracking-wider mb-1">
            <Info className="w-3 h-3" />
            <span>AI Action Trace & Transparency</span>
          </div>
          <p><strong className="text-white">Reason:</strong> &quot;{getActionReason()}&quot;</p>
          <p><strong className="text-white">Tool:</strong> <code className="text-emerald-400">{toolCall.name}</code></p>
          <p><strong className="text-white">Parameters:</strong> {formatArgs()}</p>
          <p><strong className="text-white">Result:</strong> {getResultSummary()}</p>
        </div>
      )}

      {/* Interactive Action Button */}
      <div className="pt-1 flex items-center justify-end space-x-2">
        {isFailed && (
          <button
            onClick={() => retryToolExecution(msgId, toolCall)}
            className="px-2.5 py-1 rounded bg-[#E50914] text-white text-[11px] font-medium flex items-center space-x-1 hover:bg-[#FF1A1A] transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Action</span>
          </button>
        )}

        {isCompleted && toolCall.name === 'searchEmails' && (
          <button
            onClick={() => setFolder('inbox')}
            className="px-2.5 py-1 rounded bg-[#151515] text-[#A0A0A0] hover:bg-[#202020] hover:text-white border border-[#2A2A2A] text-[11px] font-medium flex items-center space-x-1 transition"
          >
            <span>View Results in Inbox</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {isCompleted && (toolCall.name === 'openCompose' || toolCall.name === 'fillCompose' || toolCall.name === 'replyToEmail') && (
          <button
            onClick={() => openCompose()}
            className="px-2.5 py-1 rounded bg-[#E50914]/20 text-[#E50914] hover:bg-[#E50914] hover:text-white border border-[#E50914]/30 text-[11px] font-medium flex items-center space-x-1 transition"
          >
            <span>Open Compose</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {isCompleted && toolCall.name === 'openEmail' && toolCall.args.messageId && (
          <button
            onClick={() => openEmailDetail(toolCall.args.messageId)}
            className="px-2.5 py-1 rounded bg-[#151515] text-[#A0A0A0] hover:bg-[#202020] hover:text-white border border-[#2A2A2A] text-[11px] font-medium flex items-center space-x-1 transition"
          >
            <span>Open Email Detail</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
