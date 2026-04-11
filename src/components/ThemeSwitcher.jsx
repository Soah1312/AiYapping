import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// Anthropic's stylized "A" mark
function ClaudeIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
      <path d="M13.54 3H10.46L3 21h4.16l1.58-4.08h6.52L16.84 21H21L13.54 3zm-2.11 10.68L13.04 8.6l1.61 5.08H11.43z" />
    </svg>
  );
}

// OpenAI's blossom mark (simplified faithful path)
function GPTIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
      <path d="M22.28 9.82a5.98 5.98 0 00-.52-4.91 6.05 6.05 0 00-6.51-2.9 6.07 6.07 0 00-4.56-2.02 6.05 6.05 0 00-5.77 4.19 5.98 5.98 0 00-3.99 2.9 6.05 6.05 0 00.74 7.1 5.98 5.98 0 00.51 4.91 6.05 6.05 0 006.51 2.9A6.07 6.07 0 0013.25 24a6.05 6.05 0 005.77-4.21 5.99 5.99 0 003.99-2.9 6.05 6.05 0 00-.73-7.07zM13.25 22.37a4.49 4.49 0 01-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 00.4-.68v-6.74l2.02 1.17a.07.07 0 01.04.05v5.58a4.5 4.5 0 01-4.5 4.5zM3.6 18.26a4.47 4.47 0 01-.54-3.01l.14.08 4.78 2.76a.77.77 0 00.78 0l5.84-3.37v2.33a.08.08 0 01-.03.06L9.74 19.95a4.5 4.5 0 01-6.14-1.69zM2.34 7.9a4.48 4.48 0 012.37-1.97v5.7a.77.77 0 00.39.68l5.81 3.35-2.02 1.17a.08.08 0 01-.07 0L3.96 14.1A4.5 4.5 0 012.34 7.9zm16.6 3.86L13.1 8.36l2.02-1.17a.08.08 0 01.07 0l4.83 2.79a4.49 4.49 0 01-.68 8.1v-5.68a.79.79 0 00-.4-.64zm2.01-3.02l-.14-.09-4.77-2.78a.78.78 0 00-.79 0L9.41 9.23V6.9a.07.07 0 01.03-.06l4.83-2.79a4.5 4.5 0 016.68 4.66zM8.3 12.86l-2.02-1.16a.08.08 0 01-.04-.06V6.07a4.5 4.5 0 017.37-3.45l-.14.08-4.78 2.76a.79.79 0 00-.39.68zm1.1-2.37l2.6-1.5 2.61 1.5v2.99l-2.6 1.5-2.61-1.5z" />
    </svg>
  );
}

// Gemini's 4-pointed concave star
function GeminiIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
      <path d="M12 22C12 17.52 12 15.28 10.79 13.41 9.58 11.54 7.81 10.79 4.27 9.27 3.11 8.77 2 8.28 2 12c0 3.72 1.11 3.23 2.27 2.73 3.54-1.52 5.31-2.27 6.52-4.14C12 8.72 12 6.48 12 2c0 4.48 0 6.72 1.21 8.59 1.21 1.87 2.98 2.62 6.52 4.14C20.89 15.23 22 15.72 22 12c0-3.72-1.11-3.23-2.27-2.73C16.19 10.79 14.42 11.54 13.21 13.41 12 15.28 12 17.52 12 22z" />
    </svg>
  );
}

const THEME_CONFIG = {
  claude: {
    label: 'Claude',
    Icon: ClaudeIcon,
    activeClass: 'theme-tab--claude-active',
    inactiveClass: 'theme-tab--claude-inactive',
  },
  chatgpt: {
    label: 'ChatGPT',
    Icon: GPTIcon,
    activeClass: 'theme-tab--gpt-active',
    inactiveClass: 'theme-tab--gpt-inactive',
  },
  gemini: {
    label: 'Gemini',
    Icon: GeminiIcon,
    activeClass: 'theme-tab--gemini-active',
    inactiveClass: 'theme-tab--gemini-inactive',
  },
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher" role="group" aria-label="Select UI theme">
      {Object.entries(THEME_CONFIG).map(([key, { label, Icon, activeClass, inactiveClass }]) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            aria-label={`Switch to ${label} theme`}
            aria-pressed={isActive}
            onClick={() => setTheme(key)}
            className={`theme-tab ${isActive ? activeClass : inactiveClass}`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-tab-indicator"
                className="theme-tab-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="theme-tab-icon">
              <Icon size={16} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
