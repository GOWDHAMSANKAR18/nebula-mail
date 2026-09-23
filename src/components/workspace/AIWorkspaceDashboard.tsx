'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { InboxBriefing, InboxBriefingItem } from '@/types/email';
import {
  Sparkles,
  AlertCircle,
  Clock,
  UserCheck,
  Calendar,
  Info,
  Send,
  MessageSquare,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export function AIWorkspaceDashboard() {
  const { data: session } = useSession();
  const userName = (session as any)?.user?.name?.split(' ')[0] || 'Gowdham';
  const { openEmailDetail, openCompose, messages } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<InboxBriefing | null>(null);
  const [activeTab, setActiveTab] = useState<'briefing' | 'waiting'>('briefing');

  const fetchBriefing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/briefing');
      if (!res.ok) {
        throw new Error('Failed to load Inbox Briefing.');
      }
      const data = await res.json();
      setBriefing(data.briefing);
    } catch (err: any) {
      setError(err?.message || 'Could not load briefing.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, [messages]);

  const handleOpenThread = (item: InboxBriefingItem) => {
    openEmailDetail(item.messageId);
  };

  const handleDraftFollowup = (item: InboxBriefingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nameToUse = item.fromName && item.fromName.trim() && !item.fromName.includes('@') ? item.fromName.trim() : null;
    const greeting = nameToUse ? `Hi ${nameToUse},` : 'Hi,';
    openCompose({
      to: item.fromName,
      subject: item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`,
      body: `${greeting}\n\nI hope you're doing well. I wanted to follow up on our previous conversation regarding "${item.subject}". Could you please provide an update when you have a moment?\n\nBest regards,`,
      threadId: item.threadId,
      isReply: true,
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050505] text-white overflow-y-auto p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#151515] to-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#E50914]">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">AI Intelligence Workspace</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Good day, {userName.toUpperCase()}
          </h1>
          <p className="text-sm text-[#A0A0A0]">
            Your Gmail workspace has been analyzed for action items, pending replies, and upcoming deadlines.
          </p>
        </div>

        <button
          onClick={fetchBriefing}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-[#E50914]/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>What&apos;s Important?</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-3 border-b border-[#2a2a2a] pb-3">
        <button
          onClick={() => setActiveTab('briefing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'briefing'
              ? 'bg-[#E50914] text-white shadow'
              : 'bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart Inbox Briefing</span>
        </button>

        <button
          onClick={() => setActiveTab('waiting')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'waiting'
              ? 'bg-[#E50914] text-white shadow'
              : 'bg-[#151515] text-[#A0A0A0] hover:text-white hover:bg-[#202020]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Waiting for Others ({briefing?.waitingForOthers?.length || 0})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-[#151515] border border-[#E50914]/30 rounded-2xl max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-[#E50914] mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Could not generate briefing</h3>
          <p className="text-xs text-[#A0A0A0] mt-1">{error}</p>
          <button
            onClick={fetchBriefing}
            className="mt-4 px-4 py-2 bg-[#E50914] text-white text-xs font-semibold rounded-xl hover:bg-[#FF1A1A] transition"
          >
            Try Again
          </button>
        </div>
      ) : activeTab === 'briefing' ? (
        /* Briefing View Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Needs Attention */}
          <BriefingCard
            title="Needs Attention"
            count={briefing?.needsAttention?.length || 0}
            icon={<AlertCircle className="w-4 h-4 text-[#E50914]" />}
            items={briefing?.needsAttention || []}
            onOpenItem={handleOpenThread}
          />

          {/* 2. Waiting for You */}
          <BriefingCard
            title="Waiting for You"
            count={briefing?.waitingForYou?.length || 0}
            icon={<UserCheck className="w-4 h-4 text-[#FBBF24]" />}
            items={briefing?.waitingForYou || []}
            onOpenItem={handleOpenThread}
          />

          {/* 3. Deadlines */}
          <BriefingCard
            title="Upcoming Deadlines"
            count={briefing?.deadlines?.length || 0}
            icon={<Clock className="w-4 h-4 text-[#EF4444]" />}
            items={briefing?.deadlines || []}
            onOpenItem={handleOpenThread}
          />

          {/* 4. Meetings */}
          <BriefingCard
            title="Meeting Proposals"
            count={briefing?.meetings?.length || 0}
            icon={<Calendar className="w-4 h-4 text-[#38BDF8]" />}
            items={briefing?.meetings || []}
            onOpenItem={handleOpenThread}
          />

          {/* 5. Waiting for Others */}
          <BriefingCard
            title="Waiting for Others"
            count={briefing?.waitingForOthers?.length || 0}
            icon={<Clock className="w-4 h-4 text-[#A855F7]" />}
            items={briefing?.waitingForOthers || []}
            onOpenItem={handleOpenThread}
            onDraftFollowup={handleDraftFollowup}
          />

          {/* 6. FYI */}
          <BriefingCard
            title="FYI & Updates"
            count={briefing?.fyi?.length || 0}
            icon={<Info className="w-4 h-4 text-[#4ADE80]" />}
            items={briefing?.fyi || []}
            onOpenItem={handleOpenThread}
          />
        </div>
      ) : (
        /* Dedicated Waiting For View */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#151515] border border-[#2a2a2a]">
            <h3 className="text-sm font-bold text-white">Conversations Waiting for External Response</h3>
            <p className="text-xs text-[#888888] mt-0.5">
              Based on email history context, these are messages where you appear to be waiting for a reply.
            </p>
          </div>

          <div className="divide-y divide-[#2a2a2a] bg-[#151515] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            {briefing?.waitingForOthers?.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#888888]">
                No pending responses detected. You are all caught up!
              </div>
            ) : (
              briefing?.waitingForOthers.map(item => (
                <div
                  key={item.messageId}
                  onClick={() => handleOpenThread(item)}
                  className="p-5 hover:bg-[#202020] transition flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{item.fromName}</span>
                      <span className="text-[10px] text-[#A855F7] bg-[#A855F7]/10 border border-[#A855F7]/20 px-2 py-0.5 rounded-full font-medium">
                        Likely waiting for response
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{item.subject}</p>
                    <p className="text-xs text-[#888888] truncate">{item.snippet}</p>
                  </div>

                  <button
                    onClick={e => handleDraftFollowup(item, e)}
                    className="px-3.5 py-2 bg-[#E50914] hover:bg-[#FF1A1A] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow transition shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Draft Follow-up</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefingCard({
  title,
  count,
  icon,
  items,
  onOpenItem,
  onDraftFollowup,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  items: InboxBriefingItem[];
  onOpenItem: (item: InboxBriefingItem) => void;
  onDraftFollowup?: (item: InboxBriefingItem, e: React.MouseEvent) => void;
}) {
  return (
    <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-[#333333] transition shadow-lg">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs font-bold text-white bg-[#202020] border border-[#2a2a2a] px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      <div className="space-y-3 flex-1 min-h-[100px]">
        {items.length === 0 ? (
          <p className="text-xs text-[#666666] italic pt-4">No emails in this category.</p>
        ) : (
          items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              onClick={() => onOpenItem(item)}
              className="p-3 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#444444] transition cursor-pointer space-y-1 group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white group-hover:text-[#E50914] transition truncate max-w-[150px]">
                  {item.fromName}
                </span>
                <span className="text-[10px] text-[#888888]">{item.lastUpdated}</span>
              </div>
              <p className="text-xs font-medium text-[#D0D0D0] truncate">{item.subject}</p>
              {item.reason && <p className="text-[10px] text-[#A0A0A0] truncate">{item.reason}</p>}

              {onDraftFollowup && (
                <button
                  onClick={e => onDraftFollowup(item, e)}
                  className="mt-2 text-[10px] text-[#E50914] hover:underline font-semibold flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Draft Follow-up</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
