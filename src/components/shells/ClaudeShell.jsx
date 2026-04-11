import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ThemeSwitcher';

export default function ClaudeShell({ children, sidebarChats, onSelectChat, activeChatId }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`app-sidebar scrollbar-thin ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="flex items-center justify-between px-2 pb-2">
          <Link to="/" className="brand-name" onClick={() => setSidebarOpen(false)}>
            AiYapping
          </Link>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button
          className="sidebar-item"
          style={{ background: '#F0EEE6', marginBottom: '0.5rem' }}
          onClick={() => {
            onSelectChat?.(null);
            setSidebarOpen(false);
          }}
        >
          <span className="sidebar-item-title" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Duel
          </span>
        </button>

        <p className="sidebar-section-label">Prompt Starters</p>

        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-thin">
          {(sidebarChats || []).map((chat) => (
            <button
              key={chat.id}
              className={`sidebar-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectChat?.(chat);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-item-title">{chat.title}</span>
              <span className="sidebar-item-snippet">{chat.snippet}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-2">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link to="/" className="brand-name">
              AiYapping
            </Link>
          </div>
          <ThemeSwitcher />
        </header>

        {children}
      </div>
    </div>
  );
}
