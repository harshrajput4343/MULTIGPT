import { useState } from 'react';
import { Settings, HelpCircle, LogOut, Sparkles, Palette, ChevronRight } from 'lucide-react';

interface UserMenuProps {
  user: any;
  onLogout: () => void;
  onLoginClick: () => void;
}

export function UserMenu({ user, onLogout, onLoginClick }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        style={{
          padding: '0.5rem 1.25rem',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        Login
      </button>
    );
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const userEmail = user.email || '';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'white'
        }}>
          {initials}
        </div>
        {userName}
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '280px',
            background: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden'
          }}>
            {/* User Info */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white'
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'white' }}>{userName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{userEmail.split('@')[0]}</div>
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '0.5rem' }}>
              <MenuItem icon={<Sparkles size={18} />} label="Upgrade plan" />
              <MenuItem icon={<Palette size={18} />} label="Personalization" />
              <MenuItem icon={<Settings size={18} />} label="Settings" />
              <MenuItem icon={<HelpCircle size={18} />} label="Help" hasArrow />
            </div>

            {/* Logout */}
            <div style={{
              padding: '0.5rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>

            {/* Bottom User */}
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'white'
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: '500', color: 'white', fontSize: '0.85rem' }}>{userName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Go →</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, hasArrow }: { icon: React.ReactNode; label: string; hasArrow?: boolean }) {
  return (
    <button
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem',
        background: 'transparent',
        border: 'none',
        borderRadius: '0.5rem',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.9rem',
        textAlign: 'left',
        transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {icon}
        {label}
      </div>
      {hasArrow && <ChevronRight size={16} color="var(--text-muted)" />}
    </button>
  );
}
