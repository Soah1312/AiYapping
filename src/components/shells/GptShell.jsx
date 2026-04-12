import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SquarePen, PanelLeftClose, PanelLeftOpen, Settings, Trash2 } from 'lucide-react';
import ThemeSwitcher from '../ThemeSwitcher';

export default function GptShell({
  children,
  sidebarChats,
  savedChats,
  onSelectChat,
  onSelectSavedChat,
  onDeleteSavedChat,
  activeChatId,
  activeSavedChatId,
  onOpenSettings,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`app-sidebar gpt-sidebar scrollbar-thin ${sidebarOpen ? 'sidebar-open sidebar-expanded' : 'sidebar-collapsed'}`}>
        <div className="gpt-sidebar-top">
          <Link to="/" className="gpt-wordmark">
            <img src="/icons/openai-color.svg" alt="" className="gpt-logo-image" aria-hidden="true" />
            <span className="gpt-wordmark-text gpt-collapse-hide">Ai Yapping</span>
          </Link>
        </div>

        <div className="gpt-sidebar-scroll scrollbar-thin">
          <button
            className="sidebar-item"
            onClick={() => {
              onSelectChat?.(null);
              setSidebarOpen(false);
            }}
          >
            <SquarePen size={16} />
            <span className="gpt-collapse-hide">New chat</span>
          </button>

          <div className="gpt-divider gpt-collapse-hide" />

          <p className="sidebar-section-label gpt-collapse-hide">Recents</p>
          {(savedChats || []).map((chat) => (
            <div
              key={chat.id}
              className={`gpt-history-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
            >
              <button
                type="button"
                className={`sidebar-item history-open-btn gpt-history-open ${activeSavedChatId === chat.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectSavedChat?.(chat.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="sidebar-item-title block truncate">{chat.title}</span>
              </button>
              <button
                type="button"
                className="history-delete-btn"
                aria-label="Delete saved chat"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteSavedChat?.(chat.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {sidebarOpen && (savedChats || []).length === 0 && (
            <p className="gpt-empty-recents">You haven't seen them yap yet</p>
          )}
        </div>

        <div className="gpt-sidebar-bottom sidebar-bottom">
          <button 
            className="sidebar-settings-btn"
            onClick={onOpenSettings}
          >
            <Settings size={16} />
            <span className="sidebar-item-title gpt-collapse-hide">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-2">
            <button
              className="gpt-header-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <Link to="/" className="brand-name flex items-center gap-2" style={{ fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <path d="M15 9h-6" />
                <path d="M15 13h-6" />
              </svg>
              <span className="brand-name-mobile-only">Ai Yapping</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
