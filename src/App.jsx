import { Navigate, Route, Routes, Link } from 'react-router-dom';
import ArenaPage from './pages/ArenaPage';
import SharePage from './pages/SharePage';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useTheme } from './context/ThemeContext';

function TopNav() {
  const { theme } = useTheme();

  if (theme !== 'claude') {
    return null;
  }

  const brandLabel =
    theme === 'claude'
      ? 'AiYapping'
      : theme === 'gpt'
        ? 'AI·Yapping'
        : 'AiYapping✦';

  return (
    <nav className="top-nav" aria-label="App navigation">
      <Link to="/" className="top-nav-brand" aria-label="AiYapping home">
        {brandLabel}
      </Link>
      <ThemeSwitcher />
    </nav>
  );
}

export default function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<ArenaPage />} />
        <Route path="/arena" element={<ArenaPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
