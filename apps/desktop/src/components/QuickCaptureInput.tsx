import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@stm/ui';

interface QuickCaptureInputProps {
  onAdd: (title: string) => void;
  placeholder?: string;
}

/**
 * Fast capture, not a full task form — matches Google Sheets' own Quick
 * Add ("nhập tên task → tạo với Status = Inbox"). Full task detail
 * (Area/Priority/dates picker) is the Task Detail sub-step of Phase 12,
 * not this. Shared by Inbox and Tasks (Phase 12) — both just need a
 * title and a place to put it.
 */
export function QuickCaptureInput({
  onAdd,
  placeholder = 'Capture a task… e.g. Renew passport',
}: QuickCaptureInputProps) {
  const [value, setValue] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 focus-within:ring-2 focus-within:ring-primary"
    >
      <Plus className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Capture a task"
        className="w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-muted"
      />
      <Button type="submit" variant="primary" size="sm">
        Add
      </Button>
    </form>
  );
}
