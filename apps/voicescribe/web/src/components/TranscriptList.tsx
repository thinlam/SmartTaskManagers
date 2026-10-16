import { useRef, useState } from 'react';
import type { LabeledSegment } from '../types';

function formatClockTimestamp(seconds: number): string {
  const totalSec = Math.floor(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-fuchsia-500', 'bg-rose-500'];

function avatarColorFor(speaker: string, speakerOrder: string[]): string {
  const index = speakerOrder.indexOf(speaker);
  return AVATAR_COLORS[index % AVATAR_COLORS.length] ?? 'bg-slate-500';
}

export function TranscriptList({
  segments,
  speakerOrder,
  speakerNames,
  onRenameSpeaker,
  searchQuery,
}: {
  segments: LabeledSegment[];
  speakerOrder: string[];
  speakerNames: Record<string, string>;
  onRenameSpeaker: (rawSpeaker: string, newName: string) => void;
  searchQuery: string;
}) {
  // Keyed by row index, not by raw speaker label: several rows can share
  // the same speaker, and keying by label would make all of them render
  // an <input> simultaneously, all bound to the same draft state —
  // exactly the bug this comment replaced (two live inputs fighting over
  // one piece of state, so neither commit applied).
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = searchQuery.trim()
    ? segments.filter((seg) => seg.text.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : segments;

  if (filtered.length === 0) {
    return <p className="p-6 text-sm text-white/40">Không tìm thấy đoạn nào khớp.</p>;
  }

  function startEditing(rowIndex: number, displayName: string) {
    setEditingRow(rowIndex);
    setDraftName(displayName);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitEdit(rawSpeaker: string) {
    const trimmed = draftName.trim();
    if (trimmed) onRenameSpeaker(rawSpeaker, trimmed);
    setEditingRow(null);
  }

  return (
    <div className="flex flex-col divide-y divide-white/5">
      {filtered.map((seg, i) => {
        const displayName = speakerNames[seg.speaker] ?? seg.speaker;
        const isEditing = editingRow === i;
        return (
          <div key={i} className="flex gap-4 px-6 py-4">
            <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-white/40">
              {formatClockTimestamp(seg.start)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColorFor(seg.speaker, speakerOrder)}`}
                >
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitEdit(seg.speaker)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(seg.speaker);
                      if (e.key === 'Escape') setEditingRow(null);
                    }}
                    className="rounded border border-emerald-400/50 bg-white/10 px-1.5 py-0.5 text-sm font-medium text-white outline-none"
                  />
                ) : (
                  <button
                    onClick={() => startEditing(i, displayName)}
                    className="text-sm font-medium text-white hover:underline"
                    title="Bấm để đổi tên người nói"
                  >
                    {displayName}
                  </button>
                )}
              </div>
              <p className="text-[15px] leading-relaxed text-white/85">{seg.text.trim()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
