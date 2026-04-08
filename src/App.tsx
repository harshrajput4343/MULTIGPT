import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ModelTabs } from './components/ModelTabs';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { UserMenu } from './components/UserMenu';
import { LoginModal } from './components/LoginModal';
import { ShareModal } from './components/ShareModal';
import type { Message, Chat } from './types';
import { MODELS } from './types';
import { createChatCompletion } from './lib/openrouter';
import { getChats, createChat, getMessages, saveMessage, updateChatTitle, shareChat, getSharedChatMessages, getCurrentUser, signOut, onAuthStateChange, saveMemory, getMemories, getUserProfile, updateAvatar } from './lib/supabase';
import { routeQuery } from './lib/router';
import { Share2, Check, Copy, ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal, Mic, Sparkles, Send } from 'lucide-react';

function App() {
  const [activeModelId, setActiveModelId] = useState('auto');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [routingInfo, setRoutingInfo] = useState<{ model: string; reason: string } | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'good' | 'bad' | null>>({});
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  // Voice recording
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support speech recognition. Try Chrome or Edge.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      // It will auto-stop, or we could keep a ref to the recognition instance to call .stop()
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      if (event.results[0].isFinal) {
        setInput((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // Memory detection patterns
  const detectMemory = (text: string): { key: string; value: string } | null => {
    const patterns = [
      /remember (?:that )?my (\w[\w\s]*?) is ([\w\s@.]+)/i,
      /my (\w[\w\s]*?) is ([\w\s@.]+?)(?:\.|,|!|$)/i,
      /i am ([\w\s]+)/i,
      /call me ([\w\s]+)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern === patterns[2]) return { key: 'identity', value: match[1].trim() };
        if (pattern === patterns[3]) return { key: 'name', value: match[1].trim() };
        return { key: match[1].trim().toLowerCase(), value: match[2].trim() };
      }
    }
    // Explicit "remember" keyword catch-all
    const rememberMatch = text.match(/remember[:\s]+(.+)/i);
    if (rememberMatch) return { key: 'note', value: rememberMatch[1].trim() };
    return null;
  };

  // Check for auth state on mount
  useEffect(() => {
    getCurrentUser().then(setUser);
    const { data } = onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        loadChats();
        getUserProfile().then(p => { if (p) setUserAvatar(p.avatar_id); });
      }
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
    if (!user) {
      setShowLoginModal(true);
      return;
    }
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
    if (!user) {
      setShowLoginModal(true);
      return;
    }
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
      // Detect and save memory
      const memory = detectMemory(input);
      if (memory) {
        await saveMemory(memory.key, memory.value);
      }

      // Fetch user memories for context
      const memories = await getMemories();
      let systemPrompt = '';
      if (memories.length > 0) {
        const memoryStr = memories.map(m => `${m.key}: ${m.value}`).join(', ');
        systemPrompt = `User facts you must remember and use: ${memoryStr}. Always use these facts when relevant to the conversation.`;
      }

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
        const contextMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
        // Prepend system message with memories
        if (systemPrompt) {
          contextMessages.unshift({ role: 'system', content: systemPrompt });
        }
        await createChatCompletion(
          contextMessages,
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

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg = `⚠️ **System Error**: ${error.message || 'An unexpected error occurred'}. Please check your connection or try again.`;
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        chat_id: currentChatId || 'error',
        role: 'assistant',
        content: errorMsg,
        model_used: 'system',
        timestamp: new Date().toISOString(),
      }]);
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
      onChatsUpdate={loadChats}
    >
      <header className="chat-header">
        <ModelTabs activeModelId={activeModelId} onModelChange={setActiveModelId} />
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeChatId && !isSharedView && (
            <button
              onClick={() => setShowShareModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                background: 'transparent',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Share chat"
            >
              <Share2 size={18} />
            </button>
          )}
          <UserMenu
            user={user}
            userAvatar={userAvatar}
            onLogout={async () => {
              await signOut();
              setUser(null);
              setChats([]);
              setMessages([]);
              setActiveChatId(undefined);
            }}
            onLoginClick={() => setShowLoginModal(true)}
            onAvatarChange={async (id) => {
              setUserAvatar(id);
              if (user) await updateAvatar(id);
            }}
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

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chatTitle={chats.find(c => c.id === activeChatId)?.title || 'Untitled Chat'}
        shareId={null}
        onGenerateLink={async () => {
          if (!activeChatId) return null;
          return await shareChat(activeChatId);
        }}
      />

      <div className="chat-messages">
        {routingInfo && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
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
          <div style={{ textAlign: 'center', marginTop: '15vh', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '1rem', background: '#0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
               <Sparkles size={32} color="#60a5fa" />
            </div>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              How can I help you today?
            </h1>
            <p style={{ fontSize: '1rem', maxWidth: '80%', margin: '0 auto', opacity: 0.8 }}>
              Select a model from the top to get started.
            </p>
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
                    background: copiedMsgId === msg.id + '-share' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
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
        <div className="input-wrapper glass" style={{ padding: '0.4rem 0.6rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
          {user ? (
            <>
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
                  padding: '0.75rem',
                  resize: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  height: '48px',
                  minHeight: '48px',
                  maxHeight: '200px'
                }}
              />
              <button
                onClick={toggleRecording}
                style={{
                  border: 'none',
                  color: isRecording ? '#ef4444' : 'var(--text-muted)',
                  padding: '0.6rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  marginRight: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                  background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                }}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                <Mic size={20} />
              </button>
              <button
                className="liquid-btn"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginBottom: '0.2rem'
                }}
              >
                {isLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </>
          ) : (
            <div style={{ padding: '0.8rem', textAlign: 'center', width: '100%' }}>
              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '0.8rem 2rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1.05rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)';
                }}
              >
                Sign In to Start Chatting
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
