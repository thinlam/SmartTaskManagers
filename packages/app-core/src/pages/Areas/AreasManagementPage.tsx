import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button, EmptyState } from '@stm/ui';
import { ApiError } from '@stm/api-client';
import { useAreasContext } from '../../state/AreasContext';
import { reportError, reportSuccess } from '../../lib/reportError';
import { ConfirmDialog } from '../../components/ConfirmDialog';

/**
 * "Lĩnh vực" management screen (GĐ redesign, Mục 4, 2026-11-09) — rename,
 * delete (with reassignment if still in use), add a custom area. System
 * rows (IsSystem) are shown read-only, matching the backend rule that they
 * can never be renamed or deleted.
 */
export function AreasManagementPage() {
  const { t, i18n } = useTranslation();
  const { areas, isLoading, createArea, renameArea, deleteArea } = useAreasContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNameVi, setDraftNameVi] = useState('');
  const [draftNameEn, setDraftNameEn] = useState('');
  const [newNameVi, setNewNameVi] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reassignPrompt, setReassignPrompt] = useState<{ id: string; taskCount: number } | null>(
    null,
  );
  const [reassignTo, setReassignTo] = useState('');

  const isVi = i18n.language.startsWith('vi');
  const label = (area: { nameVi: string; nameEn: string }) => (isVi ? area.nameVi : area.nameEn);

  function startRename(id: string, area: { nameVi: string; nameEn: string }) {
    setEditingId(id);
    setDraftNameVi(area.nameVi);
    setDraftNameEn(area.nameEn);
  }

  async function commitRename(id: string) {
    const nameVi = draftNameVi.trim();
    setEditingId(null);
    if (!nameVi) return;
    try {
      await renameArea(id, nameVi, draftNameEn.trim() || undefined);
      reportSuccess(t('areas.renameSuccess'));
    } catch (err) {
      reportError(err);
    }
  }

  async function handleCreate() {
    const nameVi = newNameVi.trim();
    if (!nameVi) return;
    try {
      await createArea(nameVi, newNameEn.trim() || undefined);
      setNewNameVi('');
      setNewNameEn('');
      reportSuccess(t('areas.createSuccess'));
    } catch (err) {
      reportError(err);
    }
  }

  async function confirmDelete() {
    const id = deleteTarget!;
    setDeleteTarget(null);
    try {
      await deleteArea(id);
      reportSuccess(t('areas.deleteSuccess'));
    } catch (err) {
      if (err instanceof ApiError && err.confirmAction === 'reassign') {
        setReassignPrompt({ id, taskCount: err.taskCount ?? 0 });
        return;
      }
      reportError(err);
    }
  }

  async function confirmReassignAndDelete() {
    if (!reassignPrompt || !reassignTo) return;
    const { id } = reassignPrompt;
    setReassignPrompt(null);
    try {
      await deleteArea(id, reassignTo);
      reportSuccess(t('areas.deleteSuccess'));
    } catch (err) {
      reportError(err);
    } finally {
      setReassignTo('');
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('areas.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">{t('areas.title')}</h1>
        <p className="text-sm text-ink-secondary">{t('areas.subtitle')}</p>
      </div>

      {areas.length === 0 ? (
        <EmptyState message={t('areas.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-medium">{t('areas.colNameVi')}</th>
                <th className="px-4 py-2 font-medium">{t('areas.colNameEn')}</th>
                <th className="px-4 py-2 font-medium">{t('areas.colTaskCount')}</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-surface-secondary">
                  <td className="px-4 py-3">
                    {editingId === area.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={draftNameVi}
                        maxLength={100}
                        onChange={(event) => setDraftNameVi(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename(area.id);
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    ) : area.isSystem ? (
                      <span className="font-medium text-ink-primary">{area.nameVi}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(area.id, area)}
                        className="font-medium text-ink-primary hover:underline"
                      >
                        {area.nameVi}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {editingId === area.id ? (
                      <input
                        type="text"
                        value={draftNameEn}
                        maxLength={100}
                        onChange={(event) => setDraftNameEn(event.target.value)}
                        onBlur={() => commitRename(area.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename(area.id);
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    ) : (
                      area.nameEn
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{area.taskCount}</td>
                  <td className="px-4 py-3">
                    {!area.isSystem && (
                      <button
                        type="button"
                        aria-label={t('areas.deleteAriaLabel', { name: label(area) })}
                        onClick={() => setDeleteTarget(area.id)}
                        className="text-ink-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink-primary">{t('areas.addTitle')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newNameVi}
            onChange={(event) => setNewNameVi(event.target.value)}
            placeholder={t('areas.addNameViPlaceholder')}
            maxLength={100}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            type="text"
            value={newNameEn}
            onChange={(event) => setNewNameEn(event.target.value)}
            placeholder={t('areas.addNameEnPlaceholder')}
            maxLength={100}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="button" variant="secondary" size="sm" disabled={!newNameVi.trim()} onClick={handleCreate}>
            {t('areas.addButton')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        message={t('areas.deleteConfirm')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {reassignPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-primary/40"
            onClick={() => setReassignPrompt(null)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-5 shadow-lg"
          >
            <p className="text-sm text-ink-primary">
              {t('areas.reassignPrompt', { count: reassignPrompt.taskCount })}
            </p>
            <select
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
              aria-label={t('areas.reassignSelectAriaLabel')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">{t('areas.reassignSelectPlaceholder')}</option>
              {areas
                .filter((area) => area.id !== reassignPrompt.id)
                .map((area) => (
                  <option key={area.id} value={area.id}>
                    {label(area)}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReassignPrompt(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="bg-danger hover:bg-danger/90"
                disabled={!reassignTo}
                onClick={confirmReassignAndDelete}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
