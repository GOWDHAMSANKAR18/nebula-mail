'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { EmailFilters } from '@/types/email';
import { Filter, User, Calendar, Paperclip, Star, Mail, X, Check } from 'lucide-react';
import { subDays, format } from 'date-fns';

export function FilterBar() {
  const { state, setFilters } = useApp();
  const currentFilters = state.currentFilters;

  const [fromInput, setFromInput] = useState<string>(currentFilters.from || '');
  const [dateRangeOption, setDateRangeOption] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    setFromInput(currentFilters.from || '');
  }, [currentFilters.from]);

  const applySenderFilter = (fromVal: string) => {
    const trimmed = fromVal.trim();
    setFilters({
      ...currentFilters,
      from: trimmed.length > 0 ? trimmed : undefined,
    });
  };

  const handleDatePreset = (preset: string) => {
    setDateRangeOption(preset);
    const now = new Date();
    let startDate: string | undefined = undefined;

    if (preset === 'today') {
      startDate = format(now, 'yyyy-MM-dd');
    } else if (preset === '7days') {
      startDate = format(subDays(now, 7), 'yyyy-MM-dd');
    } else if (preset === '30days') {
      startDate = format(subDays(now, 30), 'yyyy-MM-dd');
    }

    setFilters({
      ...currentFilters,
      startDate,
    });
  };

  const toggleUnread = () => {
    setFilters({
      ...currentFilters,
      unreadOnly: !currentFilters.unreadOnly,
    });
  };

  const toggleAttachment = () => {
    setFilters({
      ...currentFilters,
      hasAttachment: !currentFilters.hasAttachment,
    });
  };

  const toggleStarred = () => {
    setFilters({
      ...currentFilters,
      starredOnly: !currentFilters.starredOnly,
    });
  };

  const clearAllFilters = () => {
    setFromInput('');
    setDateRangeOption('all');
    setFilters({
      folder: currentFilters.folder || 'inbox',
    });
  };

  const hasActiveFilters =
    Boolean(currentFilters.from) ||
    Boolean(currentFilters.startDate) ||
    Boolean(currentFilters.unreadOnly) ||
    Boolean(currentFilters.hasAttachment) ||
    Boolean(currentFilters.starredOnly) ||
    Boolean(currentFilters.query);

  return (
    <div className="px-6 py-2 bg-[#0A0A0A] border-b border-[#2A2A2A] text-xs space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
          {/* Filter Icon Indicator */}
          <div className="flex items-center space-x-1 text-[#A0A0A0] font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Filter:</span>
          </div>

          {/* Sender Input */}
          <div className="relative flex items-center">
            <User className="w-3 h-3 absolute left-2.5 text-[#666666]" />
            <input
              type="text"
              value={fromInput}
              onChange={e => setFromInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') applySenderFilter(fromInput);
              }}
              onBlur={() => applySenderFilter(fromInput)}
              placeholder="Sender name or email..."
              className="bg-[#151515] border border-[#2A2A2A] rounded-lg pl-7 pr-3 py-1 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#E50914] w-36 transition"
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center space-x-1 bg-[#151515] border border-[#2A2A2A] rounded-lg p-0.5">
            <Calendar className="w-3 h-3 text-[#666666] ml-2" />
            <select
              value={dateRangeOption}
              onChange={e => handleDatePreset(e.target.value)}
              className="bg-transparent text-[#A0A0A0] hover:text-white py-1 pr-2 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#151515] text-white">All Time</option>
              <option value="today" className="bg-[#151515] text-white">Today</option>
              <option value="7days" className="bg-[#151515] text-white">Last 7 Days</option>
              <option value="30days" className="bg-[#151515] text-white">Last 30 Days</option>
            </select>
          </div>

          {/* Toggle Unread */}
          <button
            type="button"
            onClick={toggleUnread}
            className={`px-3 py-1 rounded-lg font-medium border flex items-center space-x-1.5 transition ${
              currentFilters.unreadOnly
                ? 'bg-[#E50914]/15 text-[#E50914] border-[#E50914]/40'
                : 'bg-[#151515] text-[#A0A0A0] hover:text-white border-[#2A2A2A]'
            }`}
          >
            <Mail className="w-3 h-3" />
            <span>Unread</span>
          </button>

          {/* Toggle Attachment */}
          <button
            type="button"
            onClick={toggleAttachment}
            className={`px-3 py-1 rounded-lg font-medium border flex items-center space-x-1.5 transition ${
              currentFilters.hasAttachment
                ? 'bg-[#E50914]/15 text-[#E50914] border-[#E50914]/40'
                : 'bg-[#151515] text-[#A0A0A0] hover:text-white border-[#2A2A2A]'
            }`}
          >
            <Paperclip className="w-3 h-3" />
            <span>Has Attachment</span>
          </button>

          {/* Toggle Starred */}
          <button
            type="button"
            onClick={toggleStarred}
            className={`px-3 py-1 rounded-lg font-medium border flex items-center space-x-1.5 transition ${
              currentFilters.starredOnly
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                : 'bg-[#151515] text-[#A0A0A0] hover:text-white border-[#2A2A2A]'
            }`}
          >
            <Star className="w-3 h-3" />
            <span>Starred</span>
          </button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-2.5 py-1 rounded-lg bg-[#151515] hover:bg-[#202020] text-[#A0A0A0] hover:text-white border border-[#2A2A2A] flex items-center space-x-1 transition text-xs"
          >
            <X className="w-3 h-3" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
