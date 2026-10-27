import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Pencil, Plus } from 'lucide-react';
import type { LabeledSegment } from '../types';
import {
  assignBlockSpeaker,
  buildBlocks,
  clock,
  displayName,
  nextSpeakerKey,
  replaceBlockText,
  type Block,
} from '../lib/transcript';

export const SPEAKER_COLORS = [
  { dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700' },
  { dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
  { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700' },
  { dot: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 text-fuchsia-700' },
  { dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700' },
  { dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700' },
] as const;

export function colorOf(index: number) {
  return SPEAKER_COLORS[Math.max(0, index) % SPEAKER_COLORS.length]!;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps case-insensitive matches of the query in <mark>. */
export function Highlighted({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'i'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  onBlur,
  className = '',
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Grow with the text, but cap at most of the viewport and scroll inside, so a long
  // transcript never ends up taller than what the page (or the textarea) can scroll.
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, Math.round(window.innerHeight * 0.7))}px`;
  };
  useLayoutEffect(fit, [value]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => {
    if (autoFocus) {
      const el = ref.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={`block w-full resize-none overflow-y-auto ${className}`}
    />
  );
}

/** Who said it: pick another speaker, add one, or rename the current one everywhere. */
function SpeakerMenu({
  block,
  speakerOrder,
  names,
  onAssign,
  onCreate,
  onRename,
}: {
  block: Block;
  speakerOrder: string[];
  names: Record<string, string>;
  onAssign: (raw: string) => void;
  onCreate: (name: string) => void;
  onRename: (raw: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const color = colorOf(speakerOrder.indexOf(block.speaker));
  const current = displayName(names, block.speaker);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  function submitNew() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setOpen(false);
  }

  function submitRename() {
    const name = renameDraft.trim();
    if (name && name !== current) onRename(block.speaker, name);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          setRenameDraft(current);
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Đổi người nói"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${color.soft} hover:ring-2 hover:ring-indigo-200`}
      >
        <span className={`h-2 w-2 rounded-full ${color.dot}`} />
        {current}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <p className="px-2 pb-1 pt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Đoạn này do ai nói
          </p>
          {speakerOrder.map((raw, i) => (
            <button
              key={raw}
              role="menuitemradio"
              aria-checked={raw === block.speaker}
              onClick={() => {
                if (raw !== block.speaker) onAssign(raw);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className={`h-2 w-2 rounded-full ${colorOf(i).dot}`} />
              <span className="min-w-0 flex-1 truncate">{displayName(names, raw)}</span>
              {raw === block.speaker && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
          <div className="mt-1 flex items-center gap-1.5 border-t border-slate-100 px-1 pt-2">
            <input
              value={newName}
              maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              placeholder="Người nói mới..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={submitNew}
              disabled={!newName.trim()}
              aria-label="Thêm người nói"
              className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 border-t border-slate-100 px-1 pt-2">
            <label className="mb-1 block px-1 text-xs font-medium text-slate-400">
              Đổi tên “{current}” ở mọi đoạn
            </label>
            <input
              value={renameDraft}
              maxLength={60}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
              onBlur={submitRename}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface SegmentsChange {
  segments: LabeledSegment[];
  speakerNames?: Record<string, string>;
}

/** Mode "Phân người nói": one block per speaker turn, editable in place. */
export function SpeakerTranscript({
  segments,
  speakerOrder,
  speakerNames,
  editing,
  query,
  onChange,
  onRenameSpeaker,
}: {
  segments: LabeledSegment[];
  speakerOrder: string[];
  speakerNames: Record<string, string>;
  editing: boolean;
  query: string;
  onChange: (change: SegmentsChange) => void;
  onRenameSpeaker: (raw: string, name: string) => void;
}) {
  const multiSpeaker = speakerOrder.length > 1;
  const blocks = useMemo(() => buildBlocks(segments, multiSpeaker), [segments, multiSpeaker]);
  const [editingFrom, setEditingFrom] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const q = query.trim().toLowerCase();
  const visible = q ? blocks.filter((b) => b.text.toLowerCase().includes(q)) : blocks;

  function commit(block: Block) {
    const text = draft.trim();
    setEditingFrom(null);
    if (text && text !== block.text) {
      onChange({ segments: replaceBlockText(segments, block, text) });
    }
  }

  if (visible.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Không có đoạn nào khớp.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {visible.map((block) => {
        const color = colorOf(speakerOrder.indexOf(block.speaker));
        const isEditing = editing && editingFrom === block.from;
        return (
          <section
            key={block.from}
            className="grid grid-cols-[56px_1fr] gap-x-3 rounded-xl px-3 py-3 hover:bg-slate-50/70"
          >
            <span className="pt-1 font-mono text-xs text-slate-400">{clock(block.start)}</span>
            <div className="min-w-0">
              {editing ? (
                <SpeakerMenu
                  block={block}
                  speakerOrder={speakerOrder}
                  names={speakerNames}
                  onAssign={(raw) =>
                    onChange({ segments: assignBlockSpeaker(segments, block, raw) })
                  }
                  onCreate={(name) => {
                    const raw = nextSpeakerKey(speakerOrder);
                    onChange({
                      segments: assignBlockSpeaker(segments, block, raw),
                      speakerNames: { ...speakerNames, [raw]: name },
                    });
                  }}
                  onRename={onRenameSpeaker}
                />
              ) : (
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800`}>
                  <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                  {displayName(speakerNames, block.speaker)}
                </span>
              )}

              {isEditing ? (
                <div className="mt-2">
                  <AutoTextarea
                    autoFocus
                    value={draft}
                    onChange={setDraft}
                    onBlur={() => commit(block)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingFrom(null);
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(block);
                    }}
                    className="rounded-lg border border-indigo-300 bg-white px-3 py-2 leading-7 text-slate-800 outline-none ring-2 ring-indigo-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">Ctrl + Enter để lưu · Esc để hủy</p>
                </div>
              ) : editing ? (
                <button
                  onClick={() => {
                    setDraft(block.text);
                    setEditingFrom(block.from);
                  }}
                  className="group/edit mt-2 block w-full rounded-lg border border-dashed border-transparent px-3 py-2 text-left leading-7 text-slate-700 hover:border-slate-300 hover:bg-white"
                  title="Bấm để sửa"
                >
                  <Highlighted text={block.text} query={query} />
                  <Pencil className="ml-2 inline h-3.5 w-3.5 text-slate-300 group-hover/edit:text-indigo-500" />
                </button>
              ) : (
                <p className="mt-1 leading-7 text-slate-700">
                  <Highlighted text={block.text} query={query} />
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Mode "Đoạn văn": everything as one continuous paragraph, no speakers. */
export function ParagraphTranscript({
  text,
  editing,
  query,
  onSave,
  onCancel,
}: {
  text: string;
  editing: boolean;
  query: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    if (editing) setDraft(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (editing) {
    const changed = draft.trim() !== text.trim();
    return (
      <div>
        <AutoTextarea
          autoFocus
          value={draft}
          onChange={setDraft}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && changed && draft.trim()) {
              onSave(draft);
            }
          }}
          className="min-h-[200px] rounded-xl border border-indigo-300 bg-white px-5 py-4 text-[15px] leading-8 text-slate-800 outline-none ring-2 ring-indigo-100"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Ctrl + Enter để lưu · Esc để hủy</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={!changed || !draft.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap px-2 text-[15px] leading-8 text-slate-800">
      <Highlighted text={text} query={query} />
    </p>
  );
}
