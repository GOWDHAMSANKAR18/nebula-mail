'use client';

import React, { useState } from 'react';
import { PrivacySettings, WritingStyle } from '@/types/email';
import { Shield, Sparkles, X, Check, Save, RotateCcw } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: PrivacySettings;
  writingStyle: WritingStyle;
  onSavePrivacy: (privacy: PrivacySettings) => void;
  onSaveWritingStyle: (style: WritingStyle) => void;
}

export function AISettingsModal({
  isOpen,
  onClose,
  privacy,
  writingStyle,
  onSavePrivacy,
  onSaveWritingStyle,
}: AISettingsModalProps) {
  const [privacyState, setPrivacyState] = useState<PrivacySettings>(privacy);
  const [styleState, setStyleState] = useState<WritingStyle>(writingStyle);
  const [activeTab, setActiveTab] = useState<'privacy' | 'style'>('privacy');
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePrivacy(privacyState);
    onSaveWritingStyle(styleState);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleResetStyle = () => {
    setStyleState({
      formality: 'balanced',
      length: 'balanced',
      includeGreetings: true,
      includeSignOff: true,
      customInstructions: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#151515] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base font-bold text-white">AI Workspace Settings</h3>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="p-1 rounded bg-[#202020] text-[#888888] hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a] bg-[#0a0a0a]">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center space-x-2 border-b-2 ${
              activeTab === 'privacy'
                ? 'border-[#E50914] text-[#E50914] bg-[#151515]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>AI Privacy Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center space-x-2 border-b-2 ${
              activeTab === 'style'
                ? 'border-[#E50914] text-[#E50914] bg-[#151515]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>My Writing Style</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'privacy' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable AI Features</h4>
                    <p className="text-[11px] text-[#888888]">Enable smart thread summaries, AI replies & briefings.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyState.aiEnabled}
                    onChange={e => setPrivacyState(prev => ({ ...prev, aiEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Ask Before AI Processing</h4>
                    <p className="text-[11px] text-[#888888]">Prompt for confirmation before sending email context server-side.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyState.askBeforeProcessing}
                    onChange={e => setPrivacyState(prev => ({ ...prev, askBeforeProcessing: e.target.checked }))}
                    className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a] space-y-2">
                <h4 className="text-xs font-bold text-white">AI Provider Choice</h4>
                <p className="text-[11px] text-[#888888]">Select your preferred AI engine for email context processing.</p>
                <select
                  value={privacyState.provider}
                  onChange={e => setPrivacyState(prev => ({ ...prev, provider: e.target.value as any }))}
                  className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                >
                  <option value="gemini">☁ Gemini AI (Server-Side API via GEMINI_API_KEY)</option>
                  <option value="ollama">🔒 Local Ollama (Runs 100% locally via http://localhost:11434)</option>
                </select>

                <div className="mt-2 p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222222] text-[11px] text-[#A0A0A0]">
                  {privacyState.provider === 'ollama' ? (
                    <p className="text-emerald-400 font-medium">
                      🔒 <strong>Local Privacy Mode:</strong> Email content is processed locally via Ollama. No data is sent to external AI servers.
                    </p>
                  ) : (
                    <p className="text-blue-300 font-medium">
                      ☁ <strong>Gemini Cloud AI:</strong> Only the email content required for the requested AI operation is sent to Gemini via secure server-side API. Your API key is never exposed to the browser.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Active AI Profile Persona</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['professional', 'friendly', 'concise', 'technical', 'creative', 'executive'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setStyleState(prev => ({ ...prev, selectedProfile: p }))}
                      className={`p-2.5 text-left rounded-xl border transition ${
                        (styleState.selectedProfile || 'professional') === p
                          ? 'bg-[#E50914]/10 border-[#E50914] text-white'
                          : 'bg-[#151515] text-[#888888] border-[#2a2a2a] hover:border-[#444444] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold capitalize flex items-center justify-between">
                        <span>{p}</span>
                        {(styleState.selectedProfile || 'professional') === p && (
                          <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#888888] mt-0.5 line-clamp-1">
                        {p === 'professional' && 'Formal, structured workplace tone'}
                        {p === 'friendly' && 'Warm, natural, conversational'}
                        {p === 'concise' && 'Shortest direct response'}
                        {p === 'technical' && 'Precise domain terminology'}
                        {p === 'creative' && 'Expressive wording & varied phrasing'}
                        {p === 'executive' && 'Polished C-level summary'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Formality</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['formal', 'balanced', 'friendly'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStyleState(prev => ({ ...prev, formality: f }))}
                      className={`py-2 text-xs font-semibold rounded-lg capitalize border transition ${
                        styleState.formality === f
                          ? 'bg-[#E50914] text-white border-[#E50914]'
                          : 'bg-[#151515] text-[#888888] border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Default Reply Length</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['concise', 'balanced', 'detailed'] as const).map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setStyleState(prev => ({ ...prev, length: l }))}
                      className={`py-2 text-xs font-semibold rounded-lg capitalize border transition ${
                        styleState.length === l
                          ? 'bg-[#E50914] text-white border-[#E50914]'
                          : 'bg-[#151515] text-[#888888] border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Custom Style Instructions</label>
                <textarea
                  value={styleState.customInstructions || ''}
                  onChange={e => setStyleState(prev => ({ ...prev, customInstructions: e.target.value }))}
                  placeholder="e.g. Always include a brief note of thanks. Keep sentences concise."
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] placeholder-[#666666]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetStyle}
                  className="text-xs text-[#888888] hover:text-white flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Writing Style</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#151515] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#202020] text-[#D0D0D0] hover:text-white text-xs font-medium rounded-xl transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow transition"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
