import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Search,
  SlidersHorizontal,
  MessageSquare,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  X,
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
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSavedChats = useMemo(() => {
    if (!normalizedQuery) {
      return savedChats || [];
    }

    return (savedChats || []).filter((chat) =>
      String(chat.title || '').toLowerCase().includes(normalizedQuery)
      || String(chat.snippet || '').toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, savedChats]);

  const filteredSidebarChats = useMemo(() => {
    if (!normalizedQuery) {
      return sidebarChats || [];
    }

    return (sidebarChats || []).filter((chat) =>
      String(chat.title || '').toLowerCase().includes(normalizedQuery)
      || String(chat.snippet || '').toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, sidebarChats]);

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
          <Link to="/" className="brand-name claude-sidebar-brand" onClick={() => setMobileSidebarOpen(false)}>
            {sidebarOpen ? 'Claude' : 'C'}
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
          className={`claude-nav-item ${showSearch ? 'active' : ''}`}
          onClick={() => {
            setShowSearch((value) => !value);
            if (showSearch) {
              setSearchQuery('');
            }
          }}
        >
          <Search size={16} />
          <span className="claude-collapse-hide">Search</span>
        </button>

        <button type="button" className="claude-nav-item">
          <SlidersHorizontal size={16} />
          <span className="claude-collapse-hide">Customize</span>
        </button>

        {sidebarOpen && showSearch && (
          <div className="claude-search-wrap">
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="theme-input claude-search-input"
              placeholder="Search chats and prompts"
            />
          </div>
        )}

        <div className="claude-divider" />

        <p className="sidebar-section-label claude-collapse-hide">Prompt Starters</p>
        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-thin claude-recents-wrap">
          {filteredSidebarChats.map((chat) => (
            <button
              key={chat.id}
              className={`claude-nav-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectChat?.(chat);
                setMobileSidebarOpen(false);
              }}
            >
              <Sparkles size={16} />
              <span className="claude-collapse-hide sidebar-item-title">{chat.title}</span>
            </button>
          ))}

          <div className="claude-divider" />

          <p className="sidebar-section-label claude-collapse-hide" style={{ marginTop: 0 }}>Recents</p>

          {filteredSavedChats.map((chat) => (
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

          {sidebarOpen && filteredSavedChats.length === 0 && (
            <p className="claude-empty-recents">You haven't seen them yap yet.</p>
          )}
        </div>

        <div className="claude-sidebar-bottom">
          <div className="claude-user-row">
            <User size={16} />
            <span className="claude-collapse-hide">You</span>
          </div>
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
            <Link to="/" className="brand-name brand-name-mobile-only">
              Claude
            </Link>
          </div>
          <ThemeSwitcher />
        </header>

        {children}
      </div>
    </div>
  );
}
