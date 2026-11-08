import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button, EmptyState } from '@stm/ui';
import { useTagsContext } from '../../state/TagsContext';
import { reportError, reportSuccess } from '../../lib/reportError';

/**
 * Tag management screen (Việc 1) — rename, merge, delete. Deleting only
 * unlinks the tag from its tasks (TagService.DeleteAsync); the tasks
 * themselves are never touched.
 */
export function TagsManagementPage() {
  const { t } = useTranslation();
  const { tags, isLoading, renameTag, mergeTags, deleteTag } = useTagsContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setDraftName(currentName);
  }

  async function commitRename(id: string) {
    const name = draftName.trim();
    setEditingId(null);
    if (!name) return;
    try {
      await renameTag(id, name);
      reportSuccess(t('tags.renameSuccess'));
    } catch (err) {
      reportError(err);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(t('tags.deleteConfirm', { name }))) return;
    try {
      await deleteTag(id);
      reportSuccess(t('tags.deleteSuccess'));
    } catch (err) {
      reportError(err);
    }
  }

  async function handleMerge() {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    try {
      await mergeTags(mergeSourceId, mergeTargetId);
      reportSuccess(t('tags.mergeSuccess'));
      setMergeSourceId('');
      setMergeTargetId('');
    } catch (err) {
      reportError(err);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('tags.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">{t('tags.title')}</h1>
        <p className="text-sm text-ink-secondary">{t('tags.subtitle')}</p>
      </div>

      {tags.length === 0 ? (
        <EmptyState message={t('tags.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-medium">{t('tags.colName')}</th>
                <th className="px-4 py-2 font-medium">{t('tags.colTaskCount')}</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-surface-secondary">
                  <td className="px-4 py-3">
                    {editingId === tag.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        maxLength={30}
                        onChange={(event) => setDraftName(event.target.value)}
                        onBlur={() => commitRename(tag.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename(tag.id);
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(tag.id, tag.name)}
                        className="font-medium text-ink-primary hover:underline"
                      >
                        {tag.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{tag.taskCount}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label={t('tags.deleteAriaLabel', { name: tag.name })}
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="text-ink-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tags.length >= 2 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink-primary">{t('tags.mergeTitle')}</h2>
          <p className="text-xs text-ink-secondary">{t('tags.mergeHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mergeSourceId}
              onChange={(event) => setMergeSourceId(event.target.value)}
              aria-label={t('tags.mergeSourceAriaLabel')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">{t('tags.mergeSourcePlaceholder')}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-muted">{t('tags.mergeArrow')}</span>
            <select
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              aria-label={t('tags.mergeTargetAriaLabel')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">{t('tags.mergeTargetPlaceholder')}</option>
              {tags
                .filter((tag) => tag.id !== mergeSourceId)
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!mergeSourceId || !mergeTargetId}
              onClick={handleMerge}
            >
              {t('tags.mergeButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
