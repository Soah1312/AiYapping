import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import ThemeSwitcher from '../ThemeSwitcher';

export default function GeminiShell({
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
      <aside className={`app-sidebar gemini-sidebar scrollbar-thin ${mobileSidebarOpen ? 'sidebar-open' : ''} ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <div className="gemini-sidebar-top">
          <div className="gemini-sidebar-left">
            <button
              className="gemini-icon-btn"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu size={18} />
            </button>

            <Link to="/" className="brand-name gemini-sidebar-brand">
              <span className="gemini-collapse-hide gemini-gradient-text">Ai Yapping</span>
            </Link>
          </div>

          <button
            className="gemini-icon-btn"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <button
            className="gemini-mobile-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="gemini-sidebar-scroll scrollbar-thin">
          <button
            className="gemini-nav-item"
            onClick={() => {
              onSelectChat?.(null);
              setMobileSidebarOpen(false);
            }}
          >
            <Plus size={16} />
            <span className="gemini-collapse-hide">New chat</span>
          </button>

          <p className="gemini-section-label gemini-collapse-hide">Recent chats</p>
          {(savedChats || []).map((chat) => (
            <div
              key={chat.id}
              className={`gemini-history-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
            >
              <button
                type="button"
                className={`gemini-nav-item history-open-btn gemini-history-open ${activeSavedChatId === chat.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectSavedChat?.(chat.id);
                  setMobileSidebarOpen(false);
                }}
              >
                <MessageSquare size={16} />
                <span className="gemini-collapse-hide sidebar-item-title truncate">{chat.title}</span>
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
            <p className="gemini-empty-recents">You haven't seen them yap yet</p>
          )}
        </div>

        <div className="sidebar-bottom">
          <button 
            className="sidebar-settings-btn"
            onClick={onOpenSettings}
          >
            <Settings size={16} />
            <span className="gemini-collapse-hide">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <Link to="/" className="brand-name flex items-center gap-2" style={{ fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <path d="M15 9h-6" />
                <path d="M15 13h-6" />
              </svg>
              <span className="gemini-gradient-text brand-name-mobile-only">Ai Yapping</span>
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
