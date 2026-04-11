import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ThemeSwitcher';

export default function GptShell({ children, sidebarChats, onSelectChat, activeChatId }) {
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
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <button
            className="hamburger-btn"
            style={{ display: 'flex' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ECECEC" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button
            className="sidebar-item"
            style={{ width: 'auto', padding: '0.375rem 0.625rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.10)' }}
            onClick={() => {
              onSelectChat?.(null);
              setSidebarOpen(false);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        <p className="sidebar-section-label">Prompt Chats</p>

        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-thin px-1">
          {(sidebarChats || []).map((chat) => (
            <button
              key={chat.id}
              className={`sidebar-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectChat?.(chat);
                setSidebarOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <span className="sidebar-item-title block truncate">{chat.title}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-white/10 px-1">
          <div className="flex items-center justify-between px-2 py-1">
            <ThemeSwitcher />
          </div>
          <button className="sidebar-item mt-1">
            <div className="h-7 w-7 rounded-full bg-[#2F2F2F] flex items-center justify-center text-xs font-medium flex-shrink-0">U</div>
            <span className="sidebar-item-title">Profile</span>
          </button>
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
              AI·Yapping
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
