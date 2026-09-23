'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { EmailRow } from './EmailRow';
import { FilterBar } from './FilterBar';
import { Inbox, RefreshCw, AlertCircle, Filter, LogIn, RotateCcw, X, Trash2 } from 'lucide-react';
import { signIn } from 'next-auth/react';

export function InboxList() {
  const {
    messages,
    isLoading,
    error,
    state,
    openEmailDetail,
    toggleStar,
    trashEmail,
    restoreEmail,
    clearUndoToast,
    setFolder,
    refreshEmails,
    undoTrashItem,
  } = useApp();

  const handleSelectEmail = (id: string) => {
    openEmailDetail(id);
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(id);
  };

  const handleTrashEmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    trashEmail(id);
  };

  const currentFolderTitle =
    state.currentFilters.folder
      ? state.currentFilters.folder.charAt(0).toUpperCase() + state.currentFilters.folder.slice(1)
      : 'Inbox';

  const isAuthError =
    error?.includes('401') ||
    error?.includes('UNAUTHENTICATED') ||
    error?.includes('credentials') ||
    error?.includes('token');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050505] text-white overflow-hidden relative">
      {/* Top Title Bar & Filter Status */}
      <div className="px-6 py-3.5 border-b border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-bold tracking-tight text-white">{currentFolderTitle}</h2>
          <span className="text-xs text-[#A0A0A0] font-medium px-2.5 py-0.5 rounded-full bg-[#151515] border border-[#2a2a2a]">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        {state.currentFilters.query && (
          <div className="text-xs text-[#E50914] font-medium flex items-center space-x-1.5 bg-[#E50914]/10 border border-[#E50914]/20 px-3 py-1 rounded-full">
            <Filter className="w-3 h-3" />
            <span>Search: &quot;{state.currentFilters.query}&quot;</span>
          </div>
        )}
      </div>

      {/* Advanced Filter Control Bar */}
      <FilterBar />

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4 rounded-xl bg-[#151515] border border-[#2a2a2a]">
                <div className="w-8 h-8 rounded-full bg-[#202020]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#202020] rounded w-1/4" />
                  <div className="h-3 bg-[#202020]/60 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-[#E50914] mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">
              {isAuthError ? 'Gmail Authentication Required' : 'Error Loading Mailbox'}
            </h3>
            <p className="text-sm text-[#A0A0A0] mt-1">
              {isAuthError
                ? 'Your Google session has expired or Gmail permissions need to be granted. Please sign in to authorize Gmail access.'
                : error}
            </p>

            <div className="mt-5 flex items-center justify-center space-x-3">
              {isAuthError ? (
                <button
                  onClick={() => signIn('google', undefined, { prompt: 'consent' })}
                  className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-[#E50914]/25 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Re-authenticate with Google</span>
                </button>
              ) : (
                <button
                  onClick={() => refreshEmails()}
                  className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-semibold hover:bg-[#FF1A1A] transition"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-[#151515] border border-[#2a2a2a] flex items-center justify-center text-[#666666] mb-4">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No emails found</h3>
            <p className="text-sm text-[#A0A0A0] mt-1">
              {state.currentFilters.query || state.currentFilters.unreadOnly || state.currentFilters.startDate
                ? 'No messages match your active filter criteria.'
                : 'Your folder is currently empty.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {messages.map(email => (
              <EmailRow
                key={email.id}
                email={email}
                isSelected={state.currentEmailId === email.id}
                onSelect={handleSelectEmail}
                onToggleStar={handleToggleStar}
                onTrashEmail={handleTrashEmail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Interactive Undo Trash Toast */}
      {undoTrashItem && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#1A1A1A] border border-[#E50914]/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md w-full mx-4">
          <div className="p-2 rounded-lg bg-[#E50914]/15 text-[#E50914] shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              Moved to Trash
            </p>
            <p className="text-[11px] text-[#A0A0A0] truncate">
              {undoTrashItem.subject}
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => restoreEmail(undoTrashItem.id)}
              className="px-3 py-1.5 bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => {
                clearUndoToast();
                setFolder('trash');
              }}
              className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#303030] text-[#D0D0D0] hover:text-white text-xs font-medium rounded-lg transition"
            >
              View Trash
            </button>
            <button
              onClick={clearUndoToast}
              className="p-1 text-[#888888] hover:text-white transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

