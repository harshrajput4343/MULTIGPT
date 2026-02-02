import React, { useState, useEffect } from 'react';
import { Search, Plus, MessageSquare, Filter, Tag, X } from 'lucide-react';
import type { Chat, Tag as TagType } from '../types';
import { getTags, addTagToChat, removeTagFromChat, supabase } from '../lib/supabase';

interface SidebarProps {
  chats: Chat[];
  activeChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelect,
  onNewChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [tagMenuChatId, setTagMenuChatId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showCreateTag, setShowCreateTag] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const tags = await getTags();
    setAllTags(tags as TagType[]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleTagChat = async (chatId: string, tagId: string, hasTag: boolean) => {
    if (hasTag) {
      await removeTagFromChat(chatId, tagId);
    } else {
      await addTagToChat(chatId, tagId);
    }
    // Refresh would be needed here - for now just close menu
    setTagMenuChatId(null);
  };

  const createNewTag = async () => {
    if (!newTagName.trim() || !supabase) return;
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await supabase.from('tags').insert({ name: newTagName.trim(), color: randomColor });
    setNewTagName('');
    setShowCreateTag(false);
    loadTags();
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTagIds.length === 0 ||
      (chat.tags && chat.tags.some(t => selectedTagIds.includes(t.id)));
    return matchesSearch && matchesTags;
  });

  return (
    <aside className="sidebar glass">
      <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
          margin: 0,
          textAlign: 'center'
        }}>
          Multi<span style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>GPT</span>
        </h2>
        <button
          onClick={onNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Plus size={18} /> New Chat
        </button>
      </div>

      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              outline: 'none',
              width: '100%',
              fontSize: '0.875rem'
            }}
          />
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            style={{
              background: selectedTagIds.length > 0 ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Filter size={16} color={selectedTagIds.length > 0 ? 'var(--primary)' : 'var(--text-muted)'} />
          </button>
        </div>

        {showTagFilter && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {allTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  background: selectedTagIds.includes(tag.id) ? tag.color + '30' : 'rgba(255,255,255,0.05)',
                  color: selectedTagIds.includes(tag.id) ? tag.color : 'var(--text-muted)',
                  border: `1px solid ${selectedTagIds.includes(tag.id) ? tag.color : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tag.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreateTag(true)}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border-color)',
                cursor: 'pointer'
              }}
            >
              + New
            </button>
          </div>
        )}

        {showCreateTag && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem' }}>
            <input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createNewTag()}
              style={{
                flex: 1,
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'white',
                outline: 'none'
              }}
            />
            <button onClick={createNewTag} style={{ padding: '0.25rem 0.5rem', background: 'var(--primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.7rem' }}>Add</button>
            <button onClick={() => setShowCreateTag(false)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={14} color="var(--text-muted)" /></button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Chats {selectedTagIds.length > 0 && `(${filteredChats.length})`}
        </div>
        {filteredChats.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {chats.length === 0 ? 'No chats yet. Start a new one!' : 'No matching chats found.'}
          </div>
        ) : (
          filteredChats.map(chat => (
            <div
              key={chat.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                background: activeChatId === chat.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                border: activeChatId === chat.id ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
                transition: 'all 0.2s',
                marginBottom: '0.25rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTagMenuChatId(tagMenuChatId === chat.id ? null : chat.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Add tag"
                >
                  <Tag size={14} color={chat.tags && chat.tags.length > 0 ? 'var(--primary)' : 'var(--text-muted)'} />
                </button>
                <div
                  onClick={() => onChatSelect(chat.id)}
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}
                >
                  {chat.title}
                </div>
              </div>

              {/* Tag Menu Popup */}
              {tagMenuChatId === chat.id && (
                <div style={{
                  position: 'absolute',
                  left: '2.5rem',
                  top: '2.5rem',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  zIndex: 100,
                  minWidth: '120px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Add/Remove Tags</div>
                  {allTags.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No tags yet</div>
                  ) : (
                    allTags.map(tag => {
                      const hasTag = chat.tags?.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagChat(chat.id, tag.id, hasTag || false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.3rem 0.5rem',
                            marginBottom: '0.25rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: hasTag ? tag.color + '30' : 'transparent',
                            color: hasTag ? tag.color : 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {hasTag ? '✓ ' : ''}{tag.name}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {chat.tags && chat.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1.75rem' }}>
                  {chat.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.6rem',
                        background: tag.color + '20',
                        color: tag.color
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

