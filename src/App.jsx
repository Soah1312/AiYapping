import { Navigate, Route, Routes } from 'react-router-dom';
import ArenaPage from './pages/ArenaPage';
import MeowPage from './pages/MeowPage';
import SharePage from './pages/SharePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ArenaPage />} />
      <Route path="/arena" element={<ArenaPage />} />
      <Route path="/meow" element={<MeowPage />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
