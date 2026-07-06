/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        ink: 'var(--text)',
        'ink-muted': 'var(--text-muted)',
        'ink-soft': 'var(--text-soft)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-strong': 'var(--accent-strong)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warn: 'var(--warn-fg)',
        'warn-bg': 'var(--warn-bg)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
        'code-bg': 'var(--code-bg)',
        'code-border': 'var(--code-border)',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        lg: '14px',
      },
      boxShadow: {
        'soft-sm': '0 1px 2px rgba(0,0,0,0.04)',
        soft: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-md': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'soft-lg': '0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
