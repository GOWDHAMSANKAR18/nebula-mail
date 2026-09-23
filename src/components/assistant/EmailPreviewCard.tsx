'use client';

import React from 'react';
import { EmailMessage } from '@/types/email';
import { useApp } from '@/context/AppContext';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface EmailPreviewCardProps {
  email: EmailMessage;
}

export function EmailPreviewCard({ email }: EmailPreviewCardProps) {
  const { openEmailDetail } = useApp();

  const formattedDate = isNaN(new Date(email.date).getTime())
    ? email.date
    : format(new Date(email.date), 'MMM d, h:mm a');

  return (
    <div className="my-2.5 p-3.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#E50914]/50 shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#E50914]/20 text-[#E50914] font-bold text-xs flex items-center justify-center border border-[#E50914]/30">
            {email.from.name ? email.from.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h5 className="text-xs font-semibold text-white">{email.from.name || email.from.email}</h5>
            <p className="text-[10px] text-[#A0A0A0] font-mono">{formattedDate}</p>
          </div>
        </div>

        <button
          onClick={() => openEmailDetail(email.id)}
          className="px-2.5 py-1 rounded-lg bg-[#151515] text-[#E50914] hover:bg-[#E50914] hover:text-white text-[11px] font-medium flex items-center space-x-1 border border-[#E50914]/30 transition-all"
        >
          <span>Open Email</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <h4 className="mt-2 text-xs font-medium text-white line-clamp-1">{email.subject || '(No Subject)'}</h4>
      <p className="mt-1 text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">{email.snippet}</p>
    </div>
  );
}
