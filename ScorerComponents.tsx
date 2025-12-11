/**
 * Darts Scorer React Components
 * Reusable UI components extracted from Pinnacle Darts App
 */

import React, { useState, useEffect, useCallback } from 'react';

// ==================== BUTTON COMPONENT ====================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variants: Record<string, string> = {
    primary: 'bg-gold-500 hover:bg-gold-400 text-black shadow-lg shadow-gold-500/20',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white'
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ==================== SCORE DISPLAY COMPONENT ====================

interface ScoreDisplayProps {
  score: number;
  playerName: string;
  legs: number;
  average: number;
  isActive: boolean;
  history?: number[];
  showHistory?: boolean;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  playerName,
  legs,
  average,
  isActive,
  history = [],
  showHistory = true
}) => {
  return (
    <div className={`
      relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center
      ${isActive 
        ? 'bg-slate-800 border-gold-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
        : 'bg-slate-800/50 border-slate-700 opacity-80'
      }
    `}>
      <div className="text-sm text-slate-400 font-bold uppercase mb-1 truncate max-w-full">
        {playerName}
      </div>
      
      <div className="text-5xl lg:text-7xl font-black text-white mb-2">
        {score}
      </div>
      
      <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500 uppercase font-semibold bg-slate-900/50 px-3 py-1 rounded-full whitespace-nowrap">
        <span className={legs > 0 ? 'text-gold-500' : ''}>
          Legs: <span className="text-white">{legs}</span>
        </span>
        <span className="w-[1px] h-3 bg-slate-600"></span>
        <span>
          Avg: <span className="text-white">{average.toFixed(2)}</span>
        </span>
      </div>

      {showHistory && (
        <div className="mt-2 h-8 w-full border-t border-slate-700 flex items-center justify-center gap-2 text-slate-500 font-mono text-xs overflow-hidden">
          {history.slice(-3).map((h, i) => (
            <span key={i} className="px-2">{h}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== KEYPAD COMPONENT ====================

interface KeypadProps {
  onNumberClick: (num: number) => void;
  onEnter: () => void;
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
  showQuickScores?: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  onNumberClick,
  onEnter,
  onUndo,
  onClear,
  disabled = false,
  showQuickScores = false
}) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const quickScores = [26, 41, 45, 60, 81, 85, 100, 140, 180];

  return (
    <div className="flex flex-col gap-2">
      {showQuickScores && (
        <div className="grid grid-cols-5 gap-1 mb-2">
          {quickScores.map(score => (
            <button
              key={score}
              onClick={() => {
                onClear();
                String(score).split('').forEach(d => onNumberClick(parseInt(d)));
              }}
              disabled={disabled}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded transition-colors disabled:opacity-50"
            >
              {score}
            </button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-3 gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {numbers.map(num => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            disabled={disabled}
            className="bg-slate-800 hover:bg-slate-700 text-3xl font-bold rounded-lg transition-colors text-white active:scale-95 shadow-lg h-16 md:h-20"
          >
            {num}
          </button>
        ))}

        <button
          onClick={onUndo}
          disabled={disabled}
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg flex items-center justify-center active:scale-95 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>

        <button
          onClick={() => onNumberClick(0)}
          disabled={disabled}
          className="bg-slate-800 hover:bg-slate-700 text-3xl font-bold rounded-lg transition-colors text-white active:scale-95 shadow-lg"
        >
          0
        </button>

        <button
          onClick={onEnter}
          disabled={disabled}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 text-xl font-bold rounded-lg transition-colors flex items-center justify-center active:scale-95 shadow-lg"
        >
          ENTER
        </button>
      </div>
    </div>
  );
};

// ==================== INPUT DISPLAY COMPONENT ====================

interface InputDisplayProps {
  value: string;
  placeholder?: string;
  label?: string;
  onClear?: () => void;
}

export const InputDisplay: React.FC<InputDisplayProps> = ({
  value,
  placeholder = '---',
  label = 'Current Throw',
  onClear
}) => {
  return (
    <div className="bg-black/40 h-16 rounded-lg border border-slate-700 flex items-center justify-center relative">
      <span className="text-slate-500 absolute left-4 text-xs uppercase font-bold tracking-wider hidden sm:block">
        {label}
      </span>
      
      <span className={`text-4xl font-mono font-bold tracking-widest ${value ? 'text-white' : 'text-slate-600'}`}>
        {value || placeholder}
      </span>

      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-4 text-slate-500 hover:text-red-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// ==================== THROW HISTORY COMPONENT ====================

interface ThrowHistoryProps {
  history: number[];
  playerName: string;
  align?: 'left' | 'right';
  maxItems?: number;
}

export const ThrowHistory: React.FC<ThrowHistoryProps> = ({
  history,
  playerName,
  align = 'left',
  maxItems = 20
}) => {
  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <h3 className={`text-slate-500 font-bold mb-4 ${align === 'right' ? 'text-right' : ''}`}>
        {playerName} Throws
      </h3>
      
      <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        {history.slice(-maxItems).map((score, index) => (
          <div
            key={index}
            className={`
              px-3 py-1 rounded text-sm font-mono
              ${score >= 100 
                ? 'bg-gold-500/20 text-gold-400' 
                : score >= 60 
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700/50 text-slate-400'
              }
            `}
          >
            {score}
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== MATCH STATS COMPONENT ====================

interface MatchStatsProps {
  stats: {
    scores_65_plus: number;
    scores_90_plus: number;
    scores_100_plus: number;
    scores_140_plus: number;
    scores_170_plus: number;
    scores_180: number;
    best_leg: number | null;
    average: number;
    highest_checkout?: number;
  };
  compact?: boolean;
}

export const MatchStats: React.FC<MatchStatsProps> = ({ stats, compact = false }) => {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-slate-700 px-2 py-1 rounded">
          100+ <strong className="text-gold-400">{stats.scores_100_plus}</strong>
        </span>
        <span className="bg-slate-700 px-2 py-1 rounded">
          140+ <strong className="text-gold-400">{stats.scores_140_plus}</strong>
        </span>
        <span className="bg-slate-700 px-2 py-1 rounded">
          180s <strong className="text-gold-400">{stats.scores_180}</strong>
        </span>
        {stats.best_leg && (
          <span className="bg-slate-700 px-2 py-1 rounded">
            Best <strong className="text-emerald-400">{stats.best_leg}</strong>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="65+" value={stats.scores_65_plus} />
      <StatCard label="90+" value={stats.scores_90_plus} />
      <StatCard label="100+" value={stats.scores_100_plus} highlight />
      <StatCard label="140+" value={stats.scores_140_plus} highlight />
      <StatCard label="170+" value={stats.scores_170_plus} highlight />
      <StatCard label="180s" value={stats.scores_180} highlight special />
      <StatCard label="Best Leg" value={stats.best_leg ?? '-'} suffix=" darts" />
      <StatCard label="Average" value={stats.average.toFixed(2)} />
      {stats.highest_checkout && (
        <StatCard label="High Checkout" value={stats.highest_checkout} />
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
  special?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, suffix = '', highlight = false, special = false }) => (
  <div className={`
    p-3 rounded-lg border
    ${special 
      ? 'bg-gold-500/10 border-gold-500/30' 
      : highlight 
        ? 'bg-emerald-500/10 border-emerald-500/30'
        : 'bg-slate-800/50 border-slate-700'
    }
  `}>
    <div className="text-xs text-slate-400 uppercase mb-1">{label}</div>
    <div className={`text-xl font-bold ${special ? 'text-gold-400' : highlight ? 'text-emerald-400' : 'text-white'}`}>
      {value}{suffix}
    </div>
  </div>
);

// ==================== MODAL COMPONENT ====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizes: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`relative bg-slate-800 rounded-xl border border-slate-700 p-6 w-full ${sizes[size]} shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// ==================== SCORE CARD INPUT COMPONENT ====================

interface ScoreCardInputProps {
  label: string;
  subLabel?: string;
  value: number;
  onChange: (val: number) => void;
  disableTreble?: boolean;
  highlight?: boolean;
}

export const ScoreCardInput: React.FC<ScoreCardInputProps> = ({
  label,
  subLabel,
  value,
  onChange,
  disableTreble = false,
  highlight = false
}) => {
  const options = [
    { label: 'M', value: 0, color: 'miss' },
    { label: 'S', value: 1, color: 'single' },
    { label: 'D', value: 2, color: 'double' },
    ...(!disableTreble ? [{ label: 'T', value: 3, color: 'treble' }] : [])
  ];

  const colorStyles: Record<string, { active: string; inactive: string }> = {
    miss: {
      active: 'bg-slate-600 text-white border-slate-400',
      inactive: 'bg-slate-800/50 text-slate-500 border-transparent hover:bg-slate-700'
    },
    single: {
      active: 'bg-blue-600 text-white border-blue-400',
      inactive: 'bg-slate-800/50 text-blue-500 border-transparent hover:bg-slate-700'
    },
    double: {
      active: 'bg-emerald-600 text-white border-emerald-400',
      inactive: 'bg-slate-800/50 text-emerald-500 border-transparent hover:bg-slate-700'
    },
    treble: {
      active: 'bg-red-600 text-white border-red-400',
      inactive: 'bg-slate-800/50 text-red-500 border-transparent hover:bg-slate-700'
    }
  };

  return (
    <div className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
      highlight
        ? 'bg-gold-500/10 border-gold-500/50'
        : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500'
    }`}>
      <div className="text-center">
        <span className={`font-bold text-lg ${highlight ? 'text-gold-500' : 'text-slate-300'}`}>
          {label}
        </span>
        {subLabel && (
          <span className="block text-[10px] text-slate-500 uppercase font-semibold">
            {subLabel}
          </span>
        )}
      </div>

      <div className="flex gap-1 w-full justify-between">
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 h-8 rounded flex items-center justify-center font-bold text-xs transition-all duration-150 border
              ${value === opt.value 
                ? colorStyles[opt.color].active 
                : colorStyles[opt.color].inactive
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==================== CHECKOUT SUGGESTION COMPONENT ====================

interface CheckoutSuggestionProps {
  remaining: number;
}

const CHECKOUT_TABLE: Record<number, string> = {
  170: 'T20 T20 Bull',
  167: 'T20 T19 Bull',
  164: 'T20 T18 Bull',
  161: 'T20 T17 Bull',
  160: 'T20 T20 D20',
  158: 'T20 T20 D19',
  157: 'T20 T19 D20',
  156: 'T20 T20 D18',
  155: 'T20 T19 D19',
  154: 'T20 T18 D20',
  153: 'T20 T19 D18',
  152: 'T20 T20 D16',
  151: 'T20 T17 D20',
  150: 'T20 T18 D18',
  // ... add more as needed
  100: 'T20 D20',
  80: 'T20 D10',
  60: 'S20 D20',
  50: 'S10 D20',
  40: 'D20',
  36: 'D18',
  32: 'D16',
  20: 'D10',
  16: 'D8',
  8: 'D4',
  4: 'D2',
  2: 'D1'
};

export const CheckoutSuggestion: React.FC<CheckoutSuggestionProps> = ({ remaining }) => {
  const suggestion = CHECKOUT_TABLE[remaining];

  if (!suggestion || remaining > 170) return null;

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
      <span className="text-xs text-emerald-400 uppercase font-semibold">Checkout</span>
      <div className="text-lg font-bold text-emerald-300">{suggestion}</div>
    </div>
  );
};

// ==================== EXPORTS ====================

export default {
  Button,
  ScoreDisplay,
  Keypad,
  InputDisplay,
  ThrowHistory,
  MatchStats,
  Modal,
  ScoreCardInput,
  CheckoutSuggestion
};
