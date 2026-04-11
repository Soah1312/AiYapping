import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SquarePen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
            <button
              key={chat.id}
              className={`sidebar-item ${activeSavedChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectSavedChat?.(chat.id);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-item-title block truncate">{chat.title}</span>
            </button>
          ))}

          {sidebarOpen && (savedChats || []).length === 0 && (
            <p className="gpt-empty-recents">You haven't seen them yap yet</p>
          )}

          <div className="gpt-divider gpt-collapse-hide" />

          <p className="sidebar-section-label gpt-collapse-hide quick-prompts-label">Quick prompts</p>
          <div className="quick-prompts-section">
            {(sidebarChats || []).map((chat) => (
            <button
              key={chat.id}
              className={`sidebar-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectChat?.(chat);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-item-title block truncate">{chat.title}</span>
            </button>
          ))}
          </div>
        </div>

        <div className="gpt-sidebar-bottom">
          <button className="sidebar-item gpt-user-row" type="button">
            <span className="gpt-user-avatar">U</span>
            <span className="sidebar-item-title gpt-collapse-hide">User</span>
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
            <Link to="/" className="brand-name">
              Ai Yapping
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
