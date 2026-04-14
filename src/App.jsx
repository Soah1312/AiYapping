import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const ArenaPage = lazy(() => import('./pages/ArenaPage'));
const MeowPage = lazy(() => import('./pages/MeowPage'));
const SharePage = lazy(() => import('./pages/SharePage'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<ArenaPage />} />
        <Route path="/meow" element={<MeowPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
