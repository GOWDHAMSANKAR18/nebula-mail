'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AssistantMessage } from './AssistantMessage';
import { ConfirmationCard } from './ConfirmationCard';
import { Sparkles, RefreshCw, CornerDownLeft, Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export function AssistantPanel() {
  const {
    assistantMessages,
    isAssistantThinking,
    sendAssistantMessage,
    pendingConfirmationDraft,
    confirmPendingSend,
    cancelPendingSend,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isSupported, isListening, transcript, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInputPrompt(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [assistantMessages, isAssistantThinking, pendingConfirmationDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAssistantThinking) return;

    if (isListening) {
      stopListening();
    }

    const userText = inputPrompt.trim();
    setInputPrompt('');
    await sendAssistantMessage(userText);
  };

  const handleMicToggle = () => {
    if (!isSupported) {
      alert('Web Speech API is not supported in your browser.');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const quickPrompts = [
    'Get the latest emails',
    'Get the earliest emails',
    'Get recent emails',
    'Get unread emails',
    'Search my emails',
    'Find emails with attachments',
    'Find important emails',
    'Create an email',
    'Reply to the selected email',
    'Summarize recent emails',
  ];

  return (
    <aside className="w-96 bg-[#0A0A0A] border-l border-[#2A2A2A] text-white flex flex-col h-full min-h-0 select-none shrink-0 overflow-hidden">
      {/* 1. Header (Fixed top) */}
      <div className="px-5 py-4 border-b border-[#2A2A2A] bg-[#0A0A0A]/95 backdrop-blur flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Copilot</h2>
            <p className="text-[10px] text-[#A0A0A0] font-mono">UI Direct Control Agent</p>
          </div>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active</span>
        </span>
      </div>

      {/* 2. Scrollable conversation area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {assistantMessages.map(msg => (
          <AssistantMessage key={msg.id} message={msg} />
        ))}

        {/* Global Pending Confirmation Card if triggered */}
        {pendingConfirmationDraft && (
          <ConfirmationCard
            draft={pendingConfirmationDraft}
            onConfirm={confirmPendingSend}
            onCancel={cancelPendingSend}
          />
        )}

        {/* Typing indicator */}
        {isAssistantThinking && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-[#151515] border border-[#2A2A2A] text-xs text-[#A0A0A0]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E50914]" />
            <span>AI Copilot is selecting UI tool actions...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Action Chips */}
      <div className="px-3 py-2 bg-[#050505] border-t border-[#2A2A2A] flex items-center space-x-2 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
        {quickPrompts.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => sendAssistantMessage(promptText)}
            disabled={isAssistantThinking}
            className="text-[11px] px-3 py-1 rounded-full bg-[#151515] hover:bg-[#E50914] hover:text-white text-[#A0A0A0] border border-[#2A2A2A] transition shrink-0 font-medium"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* 4. Input Area with Voice Support */}
      <form onSubmit={handleSubmit} className="p-3.5 bg-[#0A0A0A] border-t border-[#2A2A2A] shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder={isListening ? 'Listening to speech...' : 'Ask Copilot or use microphone...'}
            className={`w-full bg-[#151515] border rounded-xl pl-4 pr-16 py-2.5 text-xs text-white placeholder-[#666666] focus:outline-none transition-all ${
              isListening ? 'border-[#E50914] bg-[#E50914]/10' : 'border-[#2A2A2A] focus:border-[#E50914]'
            }`}
            disabled={isAssistantThinking}
          />

          <div className="absolute right-2 flex items-center space-x-1">
            {isSupported && (
              <button
                type="button"
                onClick={handleMicToggle}
                className={`p-1.5 rounded-lg transition ${
                  isListening
                    ? 'bg-[#E50914] text-white animate-pulse'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#202020]'
                }`}
                title={isListening ? 'Stop recording voice' : 'Speak to AI Copilot'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isAssistantThinking}
              className="p-1.5 rounded-lg bg-[#E50914] hover:bg-[#FF1A1A] text-white disabled:opacity-40 transition font-bold"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
