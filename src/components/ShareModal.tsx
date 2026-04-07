import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatTitle: string;
  shareId: string | null;
  onGenerateLink: () => Promise<string | null>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  chatTitle,
  shareId: initialShareId,
  onGenerateLink
}) => {
  const [shareId, setShareId] = useState(initialShareId);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getShareUrl = () => `${window.location.origin}?share=${shareId}`;

  const handleGenerateAndCopy = async () => {
    let id = shareId;
    if (!id) {
      setLoading(true);
      id = await onGenerateLink();
      setShareId(id);
      setLoading(false);
    }
    if (id) {
      const url = `${window.location.origin}?share=${id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSocialShare = async (platform: string) => {
    let id = shareId;
    if (!id) {
      setLoading(true);
      id = await onGenerateLink();
      setShareId(id);
      setLoading(false);
    }
    if (!id) return;
    const url = encodeURIComponent(`${window.location.origin}?share=${id}`);
    const text = encodeURIComponent(`Check out this AI conversation on MultiGPT: "${chatTitle}"`);
    const urls: Record<string, string> = {
      x: `https://x.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  const socialButtons = [
    { id: 'copy', label: 'Copy link', emoji: '🔗', color: '#3b82f6' },
    { id: 'x', label: 'X', emoji: '𝕏', color: '#000000' },
    { id: 'linkedin', label: 'LinkedIn', emoji: 'in', color: '#0A66C2' },
    { id: 'reddit', label: 'Reddit', emoji: '🤖', color: '#FF4500' },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%', maxWidth: '440px',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        zIndex: 1001,
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
            Share Conversation
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
            borderRadius: '0.25rem', display: 'flex'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner */}
        <div style={{
          margin: '1rem 1.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '0.75rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5
        }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span><strong style={{ color: 'white' }}>This conversation may include personal information.</strong> Take a moment to check the content before sharing the link.</span>
        </div>

        {/* Chat Preview */}
        <div style={{
          margin: '0 1.5rem 1rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '0.75rem',
        }}>
          <div style={{
            fontSize: '0.85rem', fontWeight: 600, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {chatTitle || 'Untitled Chat'}
          </div>
          {shareId && (
            <div style={{
              fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {getShareUrl()}
            </div>
          )}
        </div>

        {/* Share Buttons */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '1.25rem',
          padding: '1rem 1.5rem 1.75rem'
        }}>
          {socialButtons.map(btn => (
            <div key={btn.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => btn.id === 'copy' ? handleGenerateAndCopy() : handleSocialShare(btn.id)}
                disabled={loading}
                style={{
                  width: 52, height: 52,
                  borderRadius: '50%',
                  background: btn.id === 'copy' && copied ? '#22c55e' : btn.color,
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: btn.id === 'linkedin' ? '1rem' : '1.25rem',
                  color: 'white', fontWeight: 800,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: `0 4px 16px ${btn.color}40`,
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {btn.id === 'copy' && copied ? <Check size={22} /> : btn.emoji}
              </button>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {btn.id === 'copy' && copied ? 'Copied!' : btn.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
