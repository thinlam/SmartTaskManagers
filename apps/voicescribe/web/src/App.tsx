import { useState } from 'react';
import { Sidebar } from './layout/Sidebar';
import { NewRecordingPage } from './pages/NewRecordingPage';
import { LibraryPage } from './pages/LibraryPage';
import { RecordingDetailPage } from './pages/RecordingDetailPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { SAMPLE_RECORDINGS } from './lib/sampleRecordings';
import type { Page } from './types';

export function App() {
  const [page, setPage] = useState<Page>('new');
  const [selectedRecordingId, setSelectedRecordingId] = useState(SAMPLE_RECORDINGS[0]!.id);

  function openRecording(id: string) {
    setSelectedRecordingId(id);
    setPage('detail');
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar page={page} onNavigate={setPage} />

      {page === 'new' && <NewRecordingPage />}
      {page === 'library' && <LibraryPage onOpenRecording={openRecording} onNewRecording={() => setPage('new')} />}
      {page === 'detail' && (
        <RecordingDetailPage id={selectedRecordingId} onBack={() => setPage('library')} />
      )}
      {page === 'folders' && <ComingSoonPage title="Thư mục" />}
      {page === 'settings' && <ComingSoonPage title="Cài đặt" />}
    </div>
  );
}
