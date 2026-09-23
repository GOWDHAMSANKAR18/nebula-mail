'use client';

import React from 'react';
import { EmailMessage } from '@/types/email';
import { Star, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface EmailRowProps {
  email: EmailMessage;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onTrashEmail: (id: string, e: React.MouseEvent) => void;
}

export function EmailRow({ email, isSelected, onSelect, onToggleStar, onTrashEmail }: EmailRowProps) {
  const dateObj = new Date(email.date);
  const timeDisplay = isNaN(dateObj.getTime())
    ? email.date
    : (Date.now() - dateObj.getTime() < 86400000 * 2
        ? format(dateObj, 'h:mm a')
        : format(dateObj, 'MMM d'));

  return (
    <div
      onClick={() => onSelect(email.id)}
      className={`group relative flex items-center px-4 py-3.5 border-b border-[#2a2a2a] cursor-pointer transition-all ${
        !email.isRead ? 'bg-[#151515] font-semibold' : 'bg-[#0a0a0a] hover:bg-[#111111]'
      } ${isSelected ? 'bg-[#E50914]/15 border-l-4 border-l-[#E50914]' : ''}`}
    >
      {/* Unread indicator dot */}
      <div className="w-2 h-2 mr-3 flex shrink-0 items-center justify-center">
        {!email.isRead && (
          <span className="w-2 h-2 rounded-full bg-[#E50914] shadow-sm shadow-[#E50914]/50" />
        )}
      </div>

      {/* Star icon button */}
      <button
        type="button"
        onClick={e => onToggleStar(email.id, e)}
        className="mr-3 text-[#666666] hover:text-amber-400 transition"
        title={email.isStarred ? 'Unstar Message' : 'Star Message'}
      >
        <Star
          className={`w-4 h-4 ${
            email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-[#666666] hover:text-amber-400'
          }`}
        />
      </button>

      {/* Sender Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#202020] border border-[#2a2a2a] text-white flex items-center justify-center font-bold text-xs mr-3 shrink-0 uppercase">
        {email.from.name ? email.from.name[0] : 'U'}
      </div>

      {/* Sender Name */}
      <div className="w-44 shrink-0 pr-2">
        <p className={`text-xs truncate ${!email.isRead ? 'text-white font-bold' : 'text-[#A0A0A0]'}`}>
          {email.from.name || email.from.email}
        </p>
      </div>

      {/* Subject & Snippet Preview */}
      <div className="flex-1 min-w-0 pr-4 flex items-baseline space-x-2">
        <span className={`text-xs truncate ${!email.isRead ? 'text-white font-semibold' : 'text-slate-200'}`}>
          {email.subject}
        </span>
        <span className="text-xs text-[#666666] truncate hidden md:inline">
          — {email.snippet}
        </span>
      </div>

      {/* Labels / Badges */}
      {email.labels && email.labels.length > 0 && (
        <div className="hidden lg:flex items-center space-x-1.5 mr-3">
          {email.labels.slice(0, 2).map(label => (
            <span
              key={label}
              className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-[#1a1a1a] text-[#A0A0A0] border border-[#2a2a2a]"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Date & Time */}
      <div className="w-20 text-right text-[11px] text-[#A0A0A0] font-mono shrink-0 group-hover:hidden">
        {timeDisplay}
      </div>

      {/* Delete / Trash Action Button on Hover */}
      <div className="hidden group-hover:flex items-center justify-end w-20 shrink-0">
        <button
          type="button"
          onClick={e => onTrashEmail(email.id, e)}
          className="p-1.5 rounded-lg text-[#666666] hover:text-[#FF1A1A] hover:bg-[#202020] transition"
          title="Move to Trash"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
