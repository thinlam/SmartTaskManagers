import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { NewRecordingPage } from './pages/NewRecordingPage';
import { LibraryPage } from './pages/LibraryPage';
import { RecordingDetailPage } from './pages/RecordingDetailPage';
import { FoldersPage } from './pages/FoldersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthProvider, ToastProvider, useAuth } from './state/AppState';
import type { Route } from './types';

function Shell() {
  const [route, setRoute] = useState<Route>({ page: 'new' });
  // Incremented whenever recordings change so the sidebar usage card refetches.
  const [dataVersion, setDataVersion] = useState(0);
  const bump = useCallback(() => setDataVersion((n) => n + 1), []);

  return (
    <div className="flex h-dvh flex-col bg-slate-50 pl-[var(--sal)] pr-[var(--sar)] pt-[var(--sat)] text-slate-900 md:flex-row">
      <Sidebar
        page={route.page}
        refreshKey={dataVersion}
        onNavigate={(page) =>
          setRoute(page === 'detail' ? { page: 'library' } : ({ page } as Route))
        }
      />

      {route.page === 'new' && (
        <NewRecordingPage
          onSaved={(id) => {
            bump();
            setRoute({ page: 'detail', id });
          }}
        />
      )}
      {route.page === 'library' && (
        <LibraryPage
          key={route.folderId ?? 'all'}
          initialFolderId={route.folderId}
          onOpenRecording={(id) => setRoute({ page: 'detail', id })}
          onNewRecording={() => setRoute({ page: 'new' })}
          onChanged={bump}
        />
      )}
      {route.page === 'detail' && (
        <RecordingDetailPage
          key={route.id}
          id={route.id}
          onBack={() => setRoute({ page: 'library' })}
          onChanged={bump}
        />
      )}
      {route.page === 'folders' && (
        <FoldersPage
          onOpenFolder={(folderId) => setRoute({ page: 'library', folderId })}
          onChanged={bump}
        />
      )}
      {route.page === 'settings' && <SettingsPage />}
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return user ? <Shell /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
