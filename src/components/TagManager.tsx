import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Tag } from '../types';
import { getTags, addTagToChat, removeTagFromChat } from '../lib/supabase';

interface TagManagerProps {
  chatId: string;
  currentTags: Tag[];
  onTagsChange: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ chatId, currentTags, onTagsChange }) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTags = async () => {
    const tags = await getTags();
    setAllTags(tags as Tag[]);
  };

  const handleAddTag = async (tag: Tag) => {
    await addTagToChat(chatId, tag.id);
    onTagsChange();
    setIsOpen(false);
    setSearch('');
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTagFromChat(chatId, tagId);
    onTagsChange();
  };

  const currentTagIds = currentTags.map(t => t.id);
  const availableTags = allTags.filter(t =>
    !currentTagIds.includes(t.id) &&
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {currentTags.map(tag => (
          <span
            key={tag.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              background: tag.color + '20',
              color: tag.color,
              border: `1px solid ${tag.color}40`
            }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={12} color={tag.color} />
            </button>
          </span>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
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
          + Add Tag
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-dark)',
          border: 'var(--glass-border)',
          borderRadius: '0.5rem',
          padding: '0.5rem',
          zIndex: 50,
          boxShadow: 'var(--glass-shadow)'
        }}>
          <input
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.4rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.25rem',
              color: 'white',
              fontSize: '0.75rem',
              outline: 'none',
              marginBottom: '0.5rem'
            }}
          />
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {availableTags.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.25rem' }}>
                No tags found
              </div>
            ) : (
              availableTags.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => handleAddTag(tag)}
                  style={{
                    padding: '0.4rem',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: tag.color
                  }} />
                  {tag.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
