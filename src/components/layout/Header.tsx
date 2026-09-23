'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Filter, X, Calendar, MailCheck, Sparkles } from 'lucide-react';
import { subDays, startOfWeek, format } from 'date-fns';

export function Header() {
  const { state, setFilters } = useApp();
  const [searchInput, setSearchInput] = useState<string>(state.currentFilters.query || '');
  const [isAISearch, setIsAISearch] = useState<boolean>(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    if (isAISearch) {
      try {
        const res = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          const data = await res.json();
          setFilters({
            ...state.currentFilters,
            query: data.gmailQuery || query,
            isAISearch: true,
          });
          return;
        }
      } catch (err) {
        console.warn('AI search error, falling back to standard search:', err);
      }
    }

    setFilters({
      ...state.currentFilters,
      query: query || undefined,
      isAISearch: false,
    });
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilters({
      ...state.currentFilters,
      query: undefined,
      isAISearch: false,
    });
  };

  const toggleUnreadFilter = () => {
    setFilters({
      ...state.currentFilters,
      unreadOnly: !state.currentFilters.unreadOnly,
    });
  };

  const applyLast10Days = () => {
    const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');
    setFilters({
      ...state.currentFilters,
      startDate: state.currentFilters.startDate === tenDaysAgo ? undefined : tenDaysAgo,
    });
  };

  const applyThisWeek = () => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    setFilters({
      ...state.currentFilters,
      startDate: state.currentFilters.startDate === weekStart ? undefined : weekStart,
    });
  };

  const hasActiveFilters =
    state.currentFilters.query ||
    state.currentFilters.unreadOnly ||
    state.currentFilters.startDate ||
    state.currentFilters.from;

  return (
    <header className="h-16 border-b border-[#2a2a2a] bg-[#0a0a0a] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={
              isAISearch
                ? 'AI Search (e.g. "Find emails where someone asked for project update")...'
                : 'Search emails or keywords (e.g. "report", "project")...'
            }
            className={`w-full bg-[#151515] border rounded-xl pl-10 pr-24 py-2 text-xs text-white placeholder-[#666666] focus:outline-none transition-all ${
              isAISearch
                ? 'border-[#E50914] ring-1 ring-[#E50914]/50'
                : 'border-[#2a2a2a] focus:border-[#E50914]'
            }`}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-[#A0A0A0] hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAISearch(!isAISearch)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition ${
                isAISearch
                  ? 'bg-[#E50914] text-white shadow'
                  : 'bg-[#202020] text-[#888888] hover:text-white'
              }`}
              title="Toggle Natural Language AI Search"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Search</span>
            </button>
          </div>
        </div>
      </form>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={toggleUnreadFilter}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition ${
            state.currentFilters.unreadOnly
              ? 'bg-[#E50914] text-white shadow-sm shadow-[#E50914]/30'
              : 'bg-[#151515] text-[#A0A0A0] hover:text-white border border-[#2a2a2a]'
          }`}
        >
          <MailCheck className="w-3.5 h-3.5" />
          <span>Unread</span>
        </button>

        <button
          onClick={applyLast10Days}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition ${
            state.currentFilters.startDate
              ? 'bg-[#E50914] text-white shadow-sm shadow-[#E50914]/30'
              : 'bg-[#151515] text-[#A0A0A0] hover:text-white border border-[#2a2a2a]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Last 10 Days</span>
        </button>

        <button
          onClick={applyThisWeek}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#151515] text-[#A0A0A0] hover:text-white border border-[#2a2a2a] flex items-center space-x-1.5 transition"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>This Week</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ folder: state.currentFilters.folder })}
            className="px-2.5 py-1.5 rounded-xl text-xs text-[#FF1A1A] hover:bg-[#E50914]/10 flex items-center space-x-1 transition font-medium"
            title="Reset Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        {/* AI Privacy Indicator */}
        <div
          className="px-2.5 py-1 rounded-xl bg-[#151515] border border-[#2A2A2A] text-[11px] font-medium flex items-center space-x-1.5 text-emerald-400"
          title={
            process.env.NEXT_PUBLIC_AI_PROVIDER === 'ollama'
              ? 'Email content is processed locally on your device.'
              : 'Email content required for AI operations is processed via Gemini server-side.'
          }
        >
          {process.env.NEXT_PUBLIC_AI_PROVIDER === 'ollama' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>🔒 Local AI</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300">☁ Gemini AI</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

