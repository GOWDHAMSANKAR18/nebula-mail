'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Inbox, Send, Star, Trash2, PenSquare, Sparkles, CheckCircle2, RefreshCw, LogIn, LogOut, FileText, AlertOctagon, LayoutDashboard, Settings } from 'lucide-react';
import { EmailFilters, PrivacySettings, WritingStyle } from '@/types/email';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AISettingsModal } from '../settings/AISettingsModal';

export function Sidebar() {
  const { state, messages, setFolder, openCompose, refreshEmails, isLoading, setWorkspaceView, setSelectedProfile } = useApp();
  const { data: session } = useSession();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    aiEnabled: true,
    askBeforeProcessing: false,
    provider: 'gemini',
  });

  const [writingStyle, setWritingStyle] = useState<WritingStyle>({
    formality: 'balanced',
    length: 'balanced',
    includeGreetings: true,
    includeSignOff: true,
    selectedProfile: state.selectedProfile || 'professional',
    customInstructions: '',
  });

  const unreadCount = messages.filter(m => !m.isRead && m.folder === 'inbox').length;
  const starredCount = messages.filter(m => m.isStarred).length;

  const navItems: { id: EmailFilters['folder'] | 'workspace'; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'workspace', label: 'AI Workspace', icon: <LayoutDashboard className="w-4 h-4 text-[#E50914]" /> },
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, badge: unreadCount },
    { id: 'starred', label: 'Starred', icon: <Star className="w-4 h-4 text-amber-400" />, badge: starredCount },
    { id: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
    { id: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'spam', label: 'Spam', icon: <AlertOctagon className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-[#2a2a2a] text-white flex flex-col justify-between h-full select-none shrink-0">
      <div>
        {/* Logo / Brand Header */}
        <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center shadow-lg shadow-[#E50914]/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white text-base">Nebula Mail</h1>
              <p className="text-[10px] text-[#A0A0A0] font-mono tracking-wider uppercase">AI Gmail Workspace</p>
            </div>
          </div>
          <button
            onClick={() => refreshEmails()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#1a1a1a] transition disabled:opacity-50"
            title="Refresh Mailbox"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E50914]' : ''}`} />
          </button>
        </div>

        {/* Primary Action Button (Red Compose Button) */}
        <div className="p-3.5">
          <button
            onClick={() => openCompose()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#E50914]/25 active:scale-[0.98] transition-all"
          >
            <PenSquare className="w-4 h-4" />
            <span>Compose Mail</span>
          </button>
        </div>

        {/* Navigation Folders */}
        <nav className="px-2 py-1 space-y-1">
          {navItems.map(item => {
            const isActive = state.currentView === item.id || (item.id !== 'workspace' && state.currentFilters.folder === item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'workspace') {
                    setWorkspaceView();
                  } else {
                    setFolder(item.id as EmailFilters['folder']);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E50914]/15 text-white border border-[#E50914]/40 font-semibold shadow-sm'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#151515]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-[#E50914]' : 'text-[#A0A0A0]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-[#E50914] text-white' : 'bg-[#202020] text-[#A0A0A0]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session & Settings */}
      <div className="p-3.5 border-t border-[#2a2a2a] bg-[#050505] space-y-2">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full py-2 px-3 rounded-xl bg-[#151515] hover:bg-[#202020] text-[#D0D0D0] hover:text-white text-xs font-semibold border border-[#2a2a2a] flex items-center justify-between transition"
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-[#E50914]" />
            <span>AI Workspace Settings</span>
          </div>
          <span className="text-[10px] text-[#888888]">Config</span>
        </button>

        {session ? (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E50914] text-white flex items-center justify-center font-bold text-xs shadow-md">
                {session.user?.name ? session.user.name[0] : 'G'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{session.user?.name || 'Google User'}</p>
                <p className="text-[10px] text-[#A0A0A0] truncate">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-[#A0A0A0] hover:text-[#FF1A1A] rounded-lg hover:bg-[#1a1a1a] transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="text-[11px] text-[#A0A0A0]">Mode:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#E50914]/15 text-[#E50914] font-bold border border-[#E50914]/30">
                Out-of-the-Box Demo
              </span>
            </div>
            <button
              onClick={() => signIn('google')}
              className="w-full py-2 px-3 rounded-xl bg-[#151515] hover:bg-[#202020] text-white text-xs font-semibold border border-[#2a2a2a] flex items-center justify-center space-x-2 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Sign in with Google OAuth</span>
            </button>
          </div>
        )}
      </div>

      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        privacy={privacy}
        writingStyle={{ ...writingStyle, selectedProfile: state.selectedProfile }}
        onSavePrivacy={setPrivacy}
        onSaveWritingStyle={style => {
          setWritingStyle(style);
          if (style.selectedProfile) {
            setSelectedProfile(style.selectedProfile);
          }
        }}
      />
    </aside>
  );
}

