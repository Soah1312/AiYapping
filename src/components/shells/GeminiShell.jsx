import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
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

            <Link to="/" className="brand-name gemini-sidebar-brand flex items-center gap-2" style={{ textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-gemini2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo shrink-0" aria-hidden="true">
                <defs>
                  <linearGradient id="yap-grad-gemini2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 9v4M8 11v2M16 11v2" />
              </svg>
              <span className="gemini-collapse-hide gemini-gradient-text">Ai Yapping</span>
            </Link>
          </div>



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
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button
              className="hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="brand-name flex items-center gap-2" style={{ fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#yap-grad-gemini)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="yap-logo">
                <defs>
                  <linearGradient id="yap-grad-gemini" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M12 9v4M8 11v2M16 11v2" />
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
