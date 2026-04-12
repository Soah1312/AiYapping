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
          <Link to="/" className="gpt-wordmark flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-gpt2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo shrink-0" aria-hidden="true">
              <defs>
                <linearGradient id="yap-grad-gpt2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 9v4M8 11v2M16 11v2" />
            </svg>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-gpt)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo">
                <defs>
                  <linearGradient id="yap-grad-gpt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 9v4M8 11v2M16 11v2" />
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
