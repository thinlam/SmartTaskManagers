import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Spinner } from './components/ui';
import { AuthProvider, LookupProvider, ToastProvider, useAuth } from './state/AppState';
import { CalendarPage } from './pages/CalendarPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { ContentFormPage } from './pages/ContentFormPage';
import { ContentsPage } from './pages/ContentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanPage } from './pages/KanbanPage';
import { LoginPage } from './pages/LoginPage';
import { MediaPage } from './pages/MediaPage';
import { MembersPage } from './pages/MembersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function Routed() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full bg-canvas">
        <Spinner />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <LookupProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="contents" element={<ContentsPage />} />
            <Route path="contents/new" element={<ContentFormPage />} />
            <Route path="contents/:id" element={<ContentFormPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </LookupProvider>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </ToastProvider>
  );
}
