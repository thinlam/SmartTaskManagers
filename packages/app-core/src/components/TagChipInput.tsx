import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTagsContext } from '../state/TagsContext';

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

interface TagChipInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Chip input with autocomplete for a task's tags (Việc 1) — replaces the
 * old free-text "comma separated" input. Enforces the same limits the
 * backend validates (max 10 tags, 30 chars each, case-insensitive dedupe)
 * client-side for immediate feedback; the backend remains the source of
 * truth.
 */
export function TagChipInput({ id, value, onChange }: TagChipInputProps) {
  const { t } = useTranslation();
  const { tags } = useTagsContext();
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => {
    const query = normalize(draft);
    const selected = new Set(value.map(normalize));
    return tags
      .filter((tag) => !selected.has(normalize(tag.name)))
      .filter((tag) => (query ? normalize(tag.name).includes(query) : true))
      .slice(0, 8);
  }, [tags, draft, value]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_TAG_LENGTH) return;
    if (value.length >= MAX_TAGS) return;
    if (value.some((existing) => normalize(existing) === normalize(trimmed))) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function removeTag(name: string) {
    onChange(value.filter((existing) => existing !== name));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      const last = value[value.length - 1];
      if (last !== undefined) removeTag(last);
    }
  }

  return (
    <div className="relative">
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary">
        {value.map((tagName) => (
          <span
            key={tagName}
            className="flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-ink-primary"
          >
            {tagName}
            <button
              type="button"
              onClick={() => removeTag(tagName)}
              aria-label={t('tasks.tagsRemoveAriaLabel', { tag: tagName })}
              className="text-ink-muted hover:text-danger"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={value.length === 0 ? t('tasks.tagsPlaceholder') : ''}
            maxLength={MAX_TAG_LENGTH}
            className="min-w-[80px] flex-1 border-none bg-transparent text-sm text-ink-primary outline-none"
          />
        )}
      </div>
      {isFocused && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface py-1 text-sm shadow-lg">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag.name)}
                className="block w-full px-3 py-1.5 text-left text-ink-primary hover:bg-surface-secondary"
              >
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
