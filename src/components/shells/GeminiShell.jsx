import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  MessageSquare,
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
            <button
              key={chat.id}
              className={`gemini-nav-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectSavedChat?.(chat.id);
                setMobileSidebarOpen(false);
              }}
            >
              <MessageSquare size={16} />
              <span className="gemini-collapse-hide sidebar-item-title truncate">{chat.title}</span>
            </button>
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
            <Link to="/" className="brand-name">
              <span className="gemini-gradient-text">Ai Yapping</span>
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
