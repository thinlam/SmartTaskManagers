import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Topbar } from './components/Topbar';
import { HubPage } from './pages/HubPage';
import { AppDetailPage } from './pages/AppDetailPage';
import { GuidePage } from './pages/GuidePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Topbar />
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/apps/:id" element={<AppDetailPage />} />
        <Route path="/guide" element={<GuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}
