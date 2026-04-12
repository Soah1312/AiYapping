import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Search,
  SlidersHorizontal,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  X,
  Settings,
} from 'lucide-react';
import ThemeSwitcher from '../ThemeSwitcher';

export default function ClaudeShell({
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'sidebar-open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`app-sidebar claude-sidebar scrollbar-thin ${mobileSidebarOpen ? 'sidebar-open' : ''} ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <div className="claude-sidebar-top">
          <Link to="/" className="brand-name claude-sidebar-brand flex items-center gap-2" style={{ textDecoration: 'none' }} onClick={() => setMobileSidebarOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-claude)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo shrink-0">
              <defs>
                <linearGradient id="yap-grad-claude" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 9v4M8 11v2M16 11v2" />
            </svg>
            {sidebarOpen && <span>Ai Yapping</span>}
          </Link>

          <div className="claude-top-actions">
            <button
              type="button"
              className="claude-collapse-btn"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <button
              className="hamburger-btn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <button
          className="claude-nav-item"
          style={{ border: '1px solid var(--border-color)' }}
          onClick={() => {
            onSelectChat?.(null);
            setMobileSidebarOpen(false);
          }}
        >
          <Plus size={16} />
          <span className="claude-collapse-hide">New chat</span>
        </button>

        <button
          type="button"
          className="claude-nav-item"
        >
          <Search size={16} />
          <span className="claude-collapse-hide">Search</span>
        </button>

        <button type="button" className="claude-nav-item">
          <SlidersHorizontal size={16} />
          <span className="claude-collapse-hide">Customize</span>
        </button>

        <div className="claude-divider" />

        <p className="sidebar-section-label claude-collapse-hide" style={{ marginTop: 0 }}>Recents</p>

        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-thin claude-recents-wrap">
          {(savedChats || []).map((chat) => (
            <div
              key={chat.id}
              className={`claude-history-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
            >
              <button
                type="button"
                className="history-open-btn claude-history-open"
                onClick={() => {
                  onSelectSavedChat?.(chat.id);
                  setMobileSidebarOpen(false);
                }}
              >
                <MessageSquare size={15} />
                <span className="claude-history-title claude-collapse-hide">{chat.title}</span>
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
            <p className="claude-empty-recents">You haven't seen them yap yet</p>
          )}
        </div>

        <div className="claude-sidebar-bottom sidebar-bottom">
          <button 
            className="sidebar-settings-btn"
            onClick={onOpenSettings}
          >
            <Settings size={16} />
            <span className="claude-collapse-hide">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-2">
            <button
              className="hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link to="/" className="brand-name brand-name-mobile-only flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-claude)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo">
                <defs>
                  <linearGradient id="yap-grad-claude" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 9v4M8 11v2M16 11v2" />
              </svg>
              <span>Ai Yapping</span>
            </Link>
          </div>
          <ThemeSwitcher />
        </header>

        {children}
      </div>
    </div>
  );
}
