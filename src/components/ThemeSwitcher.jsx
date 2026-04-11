import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const THEME_CONFIG = {
  claude: {
    label: 'Claude',
    iconPath: '/icons/claude-ai-icon.svg',
    activeClass: 'theme-tab--claude-active',
    inactiveClass: 'theme-tab--claude-inactive',
  },
  chatgpt: {
    label: 'ChatGPT',
    iconPath: '/icons/openai-color.svg',
    activeClass: 'theme-tab--gpt-active',
    inactiveClass: 'theme-tab--gpt-inactive',
  },
  gemini: {
    label: 'Gemini',
    iconPath: '/icons/gemini-color.svg',
    activeClass: 'theme-tab--gemini-active',
    inactiveClass: 'theme-tab--gemini-inactive',
  },
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher" role="group" aria-label="Select UI theme">
      {Object.entries(THEME_CONFIG).map(([key, { label, iconPath, activeClass, inactiveClass }]) => {
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
              <img
                src={iconPath}
                alt=""
                width="16"
                height="16"
                style={{
                  display: 'block',
                  objectFit: 'contain',
                  background: 'transparent',
                  filter: key === 'chatgpt' ? 'brightness(1.25) saturate(1.15)' : 'none',
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
