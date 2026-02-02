import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ModelTabs } from './components/ModelTabs';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { UserMenu } from './components/UserMenu';
import { LoginModal } from './components/LoginModal';
import type { Message, Chat } from './types';
import { MODELS } from './types';
import { createChatCompletion } from './lib/openrouter';
import { getChats, createChat, getMessages, saveMessage, updateChatTitle, shareChat, getSharedChatMessages, getCurrentUser, signOut, onAuthStateChange } from './lib/supabase';
import { routeQuery } from './lib/router';
import { Share2, Check, Copy, ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal } from 'lucide-react';

function App() {
  const [activeModelId, setActiveModelId] = useState('auto');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [routingInfo, setRoutingInfo] = useState<{ model: string; reason: string } | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'good' | 'bad' | null>>({});
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check for auth state on mount
  useEffect(() => {
    getCurrentUser().then(setUser);
    const { data } = onAuthStateChange((user) => {
      setUser(user);
      if (user) loadChats();
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  // Check for shared chat URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      loadSharedChat(shareId);
    } else {
      loadChats();
    }
  }, []);

  const loadSharedChat = async (shareId: string) => {
    const result = await getSharedChatMessages(shareId);
    if (result && 'chat' in result && 'messages' in result) {
      setMessages(result.messages as Message[]);
      setIsSharedView(true);
    }
  };

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  const loadChats = async () => {
    const data = await getChats();
    setChats(data as Chat[]);
    if (data.length > 0 && !activeChatId) {
      setActiveChatId(data[0].id);
    }
  };

  const loadMessages = async (chatId: string) => {
    const data = await getMessages(chatId);
    setMessages(data as Message[]);
  };

  const handleNewChat = async () => {
    const newChat = await createChat('New Chat');
    if (newChat) {
      setChats(prev => [newChat as Chat, ...prev]);
      setActiveChatId(newChat.id);
      setMessages([]);
      setRoutingInfo(null);
    }
  };

  // Generate chat title from first message
  const generateChatTitle = (message: string): string => {
    const cleaned = message.trim().replace(/[\n\r]/g, ' ');
    return cleaned.length > 40 ? cleaned.slice(0, 40) + '...' : cleaned;
  };

  const handleChatSelect = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Create new chat if none exists
    let currentChatId = activeChatId;
    const isFirstMessage = messages.length === 0;

    if (!currentChatId) {
      const chatTitle = generateChatTitle(input);
      const newChat = await createChat(chatTitle);
      if (newChat) {
        setChats(prev => [newChat as Chat, ...prev]);
        currentChatId = newChat.id;
        setActiveChatId(currentChatId);
      }
    } else if (isFirstMessage || chats.find(c => c.id === currentChatId)?.title === 'New Chat') {
      // Update existing chat title with first message if it's still "New Chat"
      const chatTitle = generateChatTitle(input);
      await updateChatTitle(currentChatId, chatTitle);
      setChats(prev => prev.map(chat =>
        chat.id === currentChatId ? { ...chat, title: chatTitle } : chat
      ));
    }

    if (!currentChatId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      chat_id: currentChatId,
      role: 'user',
      content: input,
      model_used: activeModelId,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message to Supabase
    await saveMessage({
      chat_id: currentChatId,
      role: 'user',
      content: userMessage.content,
      model_used: activeModelId,
    });

    try {
      // Smart Model Routing for Auto-Select
      let modelToUse = activeModelId;
      if (activeModelId === 'auto') {
        const routing = await routeQuery(input);
        modelToUse = routing.model;
        setRoutingInfo(routing);
      } else {
        setRoutingInfo(null);
      }

      let assistantContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      const assistantMessage: Message = {
        id: assistantMessageId,
        chat_id: currentChatId,
        role: 'assistant',
        content: '',
        model_used: modelToUse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        await createChatCompletion(
          [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          { model: modelToUse },
          (chunk) => {
            assistantContent += chunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
              )
            );
          }
        );
      } catch (apiError: any) {
        // Show error message in the chat
        const errorMsg = `⚠️ **Error with ${modelToUse}**: ${apiError.message || 'Model unavailable'}. Try a different model.`;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: errorMsg } : msg
          )
        );
        console.error('API Error:', apiError);
        setIsLoading(false);
        return;
      }

      // Save assistant message to Supabase
      await saveMessage({
        chat_id: currentChatId,
        role: 'assistant',
        content: assistantContent,
        model_used: modelToUse,
      });

    } catch (error) {
      console.error('Chat error:', error);
      // Handle error UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      chats={chats}
      activeChatId={activeChatId}
      onChatSelect={handleChatSelect}
      onNewChat={handleNewChat}
    >
      <header className="chat-header">
        <ModelTabs activeModelId={activeModelId} onModelChange={setActiveModelId} />
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeChatId && !isSharedView && (
            <button
              onClick={async () => {
                const shareId = await shareChat(activeChatId);
                if (shareId) {
                  const link = `${window.location.origin}?share=${shareId}`;
                  await navigator.clipboard.writeText(link);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 3000);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                background: shareCopied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '0.5rem',
                color: shareCopied ? '#22c55e' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={shareCopied ? 'Link copied!' : 'Share chat'}
            >
              {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
            </button>
          )}
          <UserMenu
            user={user}
            onLogout={async () => {
              await signOut();
              setUser(null);
              setChats([]);
              setMessages([]);
              setActiveChatId(undefined);
            }}
            onLoginClick={() => setShowLoginModal(true)}
          />
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          getCurrentUser().then(setUser);
          loadChats();
        }}
      />

      <div className="chat-messages">
        {routingInfo && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            <strong style={{ color: 'var(--primary)' }}>✨ Auto-routed to:</strong> {MODELS.find(m => m.id === routingInfo.model)?.name || routingInfo.model}
            <br />
            <span style={{ color: 'var(--text-muted)' }}>{routingInfo.reason}</span>
          </div>
        )}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '10vh', color: 'var(--text-muted)' }}>
            <h1 style={{ color: 'white', marginBottom: '1rem' }}>How can I help you today?</h1>
            <p>Select a model or use Auto-Select for the best results.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={msg.id} className={`message-bubble ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
            <div style={{ fontSize: '0.75rem', marginBottom: '0.4rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
              {msg.role === 'assistant' ? (MODELS.find(m => m.id === msg.model_used)?.name || msg.model_used) : 'You'}
            </div>
            {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content}

            {/* Action buttons for assistant messages */}
            {msg.role === 'assistant' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                {/* Copy button */}
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(msg.content);
                    setCopiedMsgId(msg.id);
                    setTimeout(() => setCopiedMsgId(null), 2000);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: copiedMsgId === msg.id ? '#22c55e' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  title="Copy response"
                >
                  {copiedMsgId === msg.id ? <Check size={16} /> : <Copy size={16} />}
                </button>

                {/* Good response button */}
                <button
                  onClick={() => setFeedback(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'good' ? null : 'good' }))}
                  style={{
                    background: feedback[msg.id] === 'good' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: feedback[msg.id] === 'good' ? '#22c55e' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  title="Good response"
                >
                  <ThumbsUp size={16} />
                </button>

                {/* Bad response button */}
                <button
                  onClick={() => setFeedback(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'bad' ? null : 'bad' }))}
                  style={{
                    background: feedback[msg.id] === 'bad' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: feedback[msg.id] === 'bad' ? '#ef4444' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  title="Bad response"
                >
                  <ThumbsDown size={16} />
                </button>

                {/* Share response button */}
                <button
                  onClick={async () => {
                    const shareText = `**${MODELS.find(m => m.id === msg.model_used)?.name || msg.model_used}:**\n\n${msg.content}`;
                    await navigator.clipboard.writeText(shareText);
                    setCopiedMsgId(msg.id + '-share');
                    setTimeout(() => setCopiedMsgId(null), 2000);
                  }}
                  style={{
                    background: copiedMsgId === msg.id + '-share' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: copiedMsgId === msg.id + '-share' ? 'var(--primary)' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  title="Share response"
                >
                  <Share2 size={16} />
                </button>

                {/* Try again button */}
                <button
                  onClick={async () => {
                    // Find the previous user message
                    const previousUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
                    if (previousUserMsg && !isLoading) {
                      // Remove current assistant message and regenerate
                      setMessages(prev => prev.filter(m => m.id !== msg.id));
                      setInput(previousUserMsg.content);
                      // Auto-send
                      setTimeout(() => {
                        const sendBtn = document.querySelector('.chat-input-container button') as HTMLButtonElement;
                        if (sendBtn) sendBtn.click();
                      }, 100);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-muted)',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  title="Try again"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} />
                </button>

                {/* More options */}
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                  title="More options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-container">
        <div className="input-wrapper glass" style={{ padding: '0.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'white',
              padding: '0.8rem',
              resize: 'none',
              outline: 'none',
              fontSize: '1rem',
              height: '50px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              background: 'var(--primary)',
              border: 'none',
              color: 'white',
              padding: '0.6rem 1.2rem',
              borderRadius: '0.6rem',
              cursor: 'pointer',
              fontWeight: '600',
              opacity: isLoading || !input.trim() ? 0.5 : 1
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default App;
