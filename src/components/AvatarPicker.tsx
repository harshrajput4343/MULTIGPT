import React from 'react';
import { X } from 'lucide-react';

export const AVATARS = [
  { id: 1, emoji: '🦊', color: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { id: 2, emoji: '🐱', color: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' },
  { id: 3, emoji: '🐶', color: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)' },
  { id: 4, emoji: '🦁', color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { id: 5, emoji: '🐼', color: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
  { id: 6, emoji: '🦄', color: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)' },
  { id: 7, emoji: '🐸', color: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
  { id: 8, emoji: '🐵', color: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  { id: 9, emoji: '🦋', color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { id: 10, emoji: '🐧', color: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
];

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarId: number;
  onSelect: (id: number) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  isOpen,
  onClose,
  currentAvatarId,
  onSelect
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%', maxWidth: '320px',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        zIndex: 1001,
        overflow: 'hidden',
        animation: 'slideUp 0.2s ease'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'white' }}>
            Choose Avatar
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.2rem',
            display: 'flex', alignItems: 'center'
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem',
          padding: '1.25rem'
        }}>
          {AVATARS.map(avatar => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              style={{
                width: '100%', aspectRatio: '1/1',
                borderRadius: '50%',
                background: avatar.color,
                border: currentAvatarId === avatar.id ? '2px solid white' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s',
                boxShadow: currentAvatarId === avatar.id ? '0 0 15px rgba(255,255,255,0.3)' : 'none',
                transform: currentAvatarId === avatar.id ? 'scale(1.1)' : 'scale(1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => {
                if (currentAvatarId !== avatar.id) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {avatar.emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
