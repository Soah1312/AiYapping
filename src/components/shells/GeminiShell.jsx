import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
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
          <button
            className="hamburger-btn"
            style={{ display: 'flex' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BDC1C6" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button
            className="sidebar-item"
            style={{ width: 'auto', padding: '0.375rem 0.75rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)', flexDirection: 'row', gap: '0.375rem', alignItems: 'center' }}
            onClick={() => {
              onSelectChat?.(null);
              setSidebarOpen(false);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ fontSize: '0.8125rem' }}>New</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto scrollbar-thin">
          {(savedChats || []).length > 0 && (
            <>
              <p className="sidebar-section-label" style={{ marginTop: '0.25rem' }}>Saved Chats</p>
              {(savedChats || []).map((chat) => (
                <div
                  key={chat.id}
                  className={`sidebar-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="history-open-btn"
                    onClick={() => {
                      onSelectSavedChat?.(chat.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="sidebar-item-title block truncate">{chat.title}</span>
                    <span className="sidebar-item-snippet block truncate">{chat.snippet}</span>
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
            </>
          )}

          <p className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>Quirky Prompt Chats</p>
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

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1E1F20] px-3 py-2">
            <span className="text-xs text-[#9AA0A6]">Theme</span>
            <ThemeSwitcher />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
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
              <span className="gemini-gradient-text">AiYapping</span>
              <span style={{ fontSize: '0.65em', verticalAlign: 'super', color: '#9AA0A6' }}>✦</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <span className="rounded-full border border-white/20 bg-[#1E1F20] px-2.5 py-1 text-xs font-medium">PRO</span>
            <div className="h-8 w-8 rounded-full bg-[#2B2F36] hidden sm:block" />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
