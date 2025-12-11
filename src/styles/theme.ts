/**
 * Darts App Theme Configuration
 * Compatible with Tailwind CSS
 *
 * Performance optimizations:
 * - All objects frozen for immutability
 * - CSS-in-JS strings pre-computed
 */

// ==================== COLOR PALETTE ====================

export const colors = Object.freeze({
  // Primary accent color (Gold)
  gold: Object.freeze({
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
  }),

  // Background colors (Slate)
  slate: Object.freeze({
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  }),

  // Score type colors
  score: Object.freeze({
    miss: Object.freeze({
      bg: '#475569',
      text: '#ffffff',
      border: '#94a3b8',
    }),
    single: Object.freeze({
      bg: '#2563eb',
      text: '#ffffff',
      border: '#60a5fa',
    }),
    double: Object.freeze({
      bg: '#059669',
      text: '#ffffff',
      border: '#34d399',
    }),
    treble: Object.freeze({
      bg: '#dc2626',
      text: '#ffffff',
      border: '#f87171',
    }),
  }),

  // Status colors
  status: Object.freeze({
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  })
});

// ==================== TYPOGRAPHY ====================

export const typography = Object.freeze({
  fontFamily: Object.freeze({
    sans: ['Inter', 'system-ui', 'sans-serif'] as const,
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'] as const,
  }),

  fontSize: Object.freeze({
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  }),

  fontWeight: Object.freeze({
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  })
});

// ==================== TAILWIND CONFIG EXTENSION ====================

export const tailwindExtend = Object.freeze({
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        gold: {
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
        }
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(234, 179, 8, 0.2)',
        'glow-blue': '0 0 10px rgba(37, 99, 235, 0.4)',
        'glow-green': '0 0 10px rgba(5, 150, 105, 0.4)',
        'glow-red': '0 0 10px rgba(220, 38, 38, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    }
  }
});

// ==================== CSS-IN-JS STYLES ====================

export const styles = Object.freeze({
  // Container styles
  container: Object.freeze({
    page: 'min-h-screen bg-slate-900 text-slate-100',
    card: 'bg-slate-800 rounded-xl border border-slate-700 p-4',
    cardHover: 'bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors',
  }),

  // Header styles
  header: Object.freeze({
    main: 'flex-none p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center',
    title: 'text-lg md:text-xl font-bold text-white',
    subtitle: 'text-[10px] text-slate-400 uppercase tracking-wider',
  }),

  // Score display styles
  scoreDisplay: Object.freeze({
    large: 'text-5xl lg:text-7xl font-black text-white',
    medium: 'text-3xl font-bold text-white',
    small: 'text-xl font-semibold text-white',
    label: 'text-sm text-slate-400 font-bold uppercase',
  }),

  // Player card styles
  playerCard: Object.freeze({
    base: 'relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center',
    active: 'bg-slate-800 border-gold-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]',
    inactive: 'bg-slate-800/50 border-slate-700 opacity-80',
  }),

  // Keypad styles
  keypad: Object.freeze({
    container: 'grid grid-cols-3 gap-2',
    button: 'bg-slate-800 hover:bg-slate-700 text-3xl font-bold rounded-lg transition-colors text-white active:scale-95 shadow-lg',
    enterButton: 'bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:bg-slate-800 text-slate-900 font-bold rounded-lg',
  }),

  // Input display styles
  inputDisplay: Object.freeze({
    container: 'bg-black/40 h-16 rounded-lg border border-slate-700 flex items-center justify-center relative',
    text: 'text-4xl font-mono font-bold tracking-widest',
    textActive: 'text-white',
    textPlaceholder: 'text-slate-600',
  }),

  // Stats badge styles
  statsBadge: Object.freeze({
    container: 'flex items-center gap-2 text-[10px] md:text-xs text-slate-500 uppercase font-semibold bg-slate-900/50 px-3 py-1 rounded-full',
    value: 'text-white',
    highlight: 'text-gold-500',
  }),
});

// ==================== COMPONENT STYLE PRESETS ====================

export const buttonVariants = Object.freeze({
  primary: 'bg-gold-500 hover:bg-gold-400 text-black shadow-lg shadow-gold-500/20',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
});

export const buttonSizes = Object.freeze({
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
});

// ==================== UTILITY CLASSES ====================

export const utilities = Object.freeze({
  // Flexbox utilities
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexCol: 'flex flex-col',

  // Text utilities
  truncate: 'truncate max-w-full',
  uppercase: 'uppercase tracking-wider',

  // Transition utilities
  transition: 'transition-all duration-200',
  transitionColors: 'transition-colors duration-200',

  // Interactive utilities
  clickable: 'cursor-pointer active:scale-95',
  disabled: 'opacity-50 cursor-not-allowed',
});

// ==================== CSS CUSTOM PROPERTIES ====================

export const cssVariables = `
:root {
  --color-gold-400: #FACC15;
  --color-gold-500: #EAB308;
  --color-gold-600: #CA8A04;

  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --shadow-glow-gold: 0 0 20px rgba(234, 179, 8, 0.2);
  --shadow-glow-active: 0 0 30px rgba(234, 179, 8, 0.3);
}
`;

// ==================== GOOGLE FONTS IMPORT ====================

export const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
`;

// ==================== DEFAULT EXPORT ====================

const theme = {
  colors,
  typography,
  tailwindExtend,
  styles,
  buttonVariants,
  buttonSizes,
  utilities,
  cssVariables,
  fontImport,
} as const;

export default theme;
