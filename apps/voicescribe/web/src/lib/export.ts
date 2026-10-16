import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { LabeledSegment } from '../types';

function formatSrtTimestamp(seconds: number): string {
  const ms = Math.round((seconds % 1) * 1000);
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function formatClockTimestamp(seconds: number): string {
  const totalSec = Math.floor(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportTxt(segments: LabeledSegment[], baseName: string): void {
  const lines = segments.map(
    (seg) => `[${formatClockTimestamp(seg.start)}] ${seg.speaker}: ${seg.text.trim()}`,
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${baseName}.txt`);
}

export function exportSrt(segments: LabeledSegment[], baseName: string): void {
  const lines = segments.flatMap((seg, i) => [
    String(i + 1),
    `${formatSrtTimestamp(seg.start)} --> ${formatSrtTimestamp(seg.end)}`,
    `${seg.speaker}: ${seg.text.trim()}`,
    '',
  ]);
  const blob = new Blob([lines.join('\n')], { type: 'application/x-subrip;charset=utf-8' });
  downloadBlob(blob, `${baseName}.srt`);
}

export async function exportDocx(segments: LabeledSegment[], baseName: string): Promise<void> {
  const paragraphs = segments.map(
    (seg) =>
      new Paragraph({
        children: [
          new TextRun({ text: `[${formatClockTimestamp(seg.start)}] `, color: '888888' }),
          new TextRun({ text: `${seg.speaker}: `, bold: true }),
          new TextRun({ text: seg.text.trim() }),
        ],
        spacing: { after: 160 },
      }),
  );
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${baseName}.docx`);
}
