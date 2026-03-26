import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import '../styles/globals.css';
import { Sidebar } from './Sidebar';
import type { Chat } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  chats: Chat[];
  activeChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onChatsUpdate?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  onChatsUpdate
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onChatSelect={(id) => {
          onChatSelect(id);
          setIsMobileMenuOpen(false);
        }}
        onNewChat={() => {
          onNewChat();
          setIsMobileMenuOpen(false);
        }}
        onChatsUpdate={onChatsUpdate}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="main-content">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu size={20} />
        </button>
        {children}
      </main>
    </div>
  );
};
