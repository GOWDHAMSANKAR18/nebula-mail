'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { InboxList } from '@/components/mail/InboxList';
import { EmailDetail } from '@/components/mail/EmailDetail';
import { ComposeDrawer } from '@/components/mail/ComposeDrawer';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';

import { AIWorkspaceDashboard } from '@/components/workspace/AIWorkspaceDashboard';

export default function Home() {
  const { state } = useApp();

  return (
    <div className="flex h-screen w-screen bg-[#050505] overflow-hidden font-sans select-none">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Mail Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-r border-[#2a2a2a]">
        <Header />
        
        <main className="flex-1 flex min-h-0 overflow-hidden relative">
          {state.currentView === 'workspace' ? (
            <AIWorkspaceDashboard />
          ) : state.currentView === 'email' && state.currentEmail ? (
            <EmailDetail />
          ) : (
            <InboxList />
          )}
        </main>
      </div>

      {/* Right AI Assistant Panel */}
      <AssistantPanel />

      {/* Compose Drawer Modal */}
      <ComposeDrawer />
    </div>
  );
}
