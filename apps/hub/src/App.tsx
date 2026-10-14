import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Button } from '@stm/ui';
import { HubPage } from './pages/HubPage';
import { AppDetailPage } from './pages/AppDetailPage';

function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            GT
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-ink-primary">GiaoTrinh Code</p>
            <p className="text-xs text-ink-secondary">App Hub</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-secondary sm:flex">
          <Link to="/" className="hover:text-ink-primary">
            Ứng dụng
          </Link>
        </nav>
        <Link to="/">
          <Button size="sm">Tải app</Button>
        </Link>
      </div>
    </header>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/apps/:id" element={<AppDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
