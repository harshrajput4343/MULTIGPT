import React, { useState, useEffect } from 'react';
import { MODELS } from '../types';
import { Sparkles, ChevronDown } from 'lucide-react';

interface ModelTabsProps {
  activeModelId: string;
  onModelChange: (modelId: string) => void;
}

export const ModelTabs: React.FC<ModelTabsProps> = ({ activeModelId, onModelChange }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeModelName = activeModelId === 'auto' ? 'Auto' : MODELS.find(m => m.id === activeModelId)?.name || 'Select Model';

  if (isMobile) {
    return (
      <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          {activeModelId === 'auto' && <Sparkles size={16} />}
          {activeModelName}
          <ChevronDown size={16} color="var(--text-muted)" />
        </button>

        {dropdownOpen && (
          <>
            <div 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
              onClick={() => setDropdownOpen(false)}
            />
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              zIndex: 100,
              minWidth: '200px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <div
                onClick={() => { onModelChange('auto'); setDropdownOpen(false); }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: activeModelId === 'auto' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: activeModelId === 'auto' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <Sparkles size={16} /> Auto
              </div>
              {MODELS.map(model => (
                <div
                  key={model.id}
                  onClick={() => { onModelChange(model.id); setDropdownOpen(false); }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    background: activeModelId === model.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: activeModelId === model.id ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  {model.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="model-tabs">
      <div
        className={`tab ${activeModelId === 'auto' ? 'active' : ''}`}
        onClick={() => onModelChange('auto')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
      >
        <Sparkles size={14} />
        Auto
      </div>
      {MODELS.map((model) => (
        <div
          key={model.id}
          className={`tab ${activeModelId === model.id ? 'active' : ''}`}
          onClick={() => onModelChange(model.id)}
        >
          {model.name}
        </div>
      ))}
    </div>
  );
};
