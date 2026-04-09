import { Navigate, Route, Routes } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import ArenaPage from './pages/ArenaPage';
import SummaryPage from './pages/SummaryPage';
import SharePage from './pages/SharePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SetupPage />} />
      <Route path="/arena" element={<ArenaPage />} />
      <Route path="/summary" element={<SummaryPage />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
