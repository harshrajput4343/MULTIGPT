import React from 'react';
import '../styles/globals.css';
import { Sidebar } from './Sidebar';
import type { Chat } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  chats: Chat[];
  activeChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  chats,
  activeChatId,
  onChatSelect,
  onNewChat
}) => {
  return (
    <div className="app-container">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onChatSelect={onChatSelect}
        onNewChat={onNewChat}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
