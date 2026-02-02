import React from 'react';
import { MODELS } from '../types';
import { Sparkles } from 'lucide-react';

interface ModelTabsProps {
  activeModelId: string;
  onModelChange: (modelId: string) => void;
}

export const ModelTabs: React.FC<ModelTabsProps> = ({ activeModelId, onModelChange }) => {
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
