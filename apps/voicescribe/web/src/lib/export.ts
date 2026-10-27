import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { LabeledSegment } from '../types';
import { clock, type Block } from './transcript';

export type ViewMode = 'paragraph' | 'speakers';

/** Everything an export needs, already resolved to the names the user sees. */
export interface ExportDoc {
  mode: ViewMode;
  title: string;
  fileBase: string;
  paragraph: string;
  /** Speaker-mode blocks with display names. */
  blocks: Block[];
  /** Raw segments with display names, for subtitles. */
  segments: LabeledSegment[];
}

function srtTimestamp(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * Saves a file and resolves to a short message for the user. The desktop webview ignores
 * <a download>, so there the file is written straight into the Downloads folder (no dialog;
 * an existing name gets " (1)", " (2)"...). In a browser it is a normal download.
 */
async function saveBlob(blob: Blob, fileName: string): Promise<string> {
  if ('__TAURI_INTERNALS__' in window) {
    const { downloadDir, join } = await import('@tauri-apps/api/path');
    const { exists, writeFile } = await import('@tauri-apps/plugin-fs');
    const dir = await downloadDir();
    const dot = fileName.lastIndexOf('.');
    const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
    const ext = dot > 0 ? fileName.slice(dot) : '';
    let name = fileName;
    for (let n = 1; await exists(await join(dir, name)); n += 1) name = `${stem} (${n})${ext}`;
    await writeFile(await join(dir, name), new Uint8Array(await blob.arrayBuffer()));
    return `Đã lưu vào thư mục Tải xuống: ${name}`;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return `Đã tải xuống: ${fileName}`;
}

/** Plain text of the current view; also what "Sao chép" puts on the clipboard. */
export function toPlainText(doc: ExportDoc): string {
  if (doc.mode === 'paragraph') return doc.paragraph;
  return doc.blocks.map((b) => `${b.speaker} [${clock(b.start)}]\n${b.text}`).join('\n\n');
}

export function exportTxt(doc: ExportDoc): Promise<string> {
  const blob = new Blob([`${toPlainText(doc)}\n`], { type: 'text/plain;charset=utf-8' });
  return saveBlob(blob, `${doc.fileBase}.txt`);
}

export function exportSrt(doc: ExportDoc): Promise<string> {
  const withSpeaker = doc.mode === 'speakers';
  const lines = doc.segments.flatMap((seg, i) => [
    String(i + 1),
    `${srtTimestamp(seg.start)} --> ${srtTimestamp(seg.end)}`,
    withSpeaker ? `${seg.speaker}: ${seg.text.trim()}` : seg.text.trim(),
    '',
  ]);
  const blob = new Blob([lines.join('\n')], { type: 'application/x-subrip;charset=utf-8' });
  return saveBlob(blob, `${doc.fileBase}.srt`);
}

export async function exportDocx(doc: ExportDoc): Promise<string> {
  const heading = new Paragraph({
    text: doc.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 240 },
  });

  const body =
    doc.mode === 'paragraph'
      ? [
          new Paragraph({
            children: [new TextRun({ text: doc.paragraph })],
            spacing: { line: 360 },
          }),
        ]
      : doc.blocks.flatMap((b) => [
          new Paragraph({
            children: [
              new TextRun({ text: b.speaker, bold: true }),
              new TextRun({ text: `  ${clock(b.start)}`, color: '888888', size: 18 }),
            ],
            keepNext: true,
            spacing: { before: 200, after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: b.text })],
            spacing: { line: 340, after: 120 },
          }),
        ]);

  const file = new Document({ sections: [{ children: [heading, ...body] }] });
  return saveBlob(await Packer.toBlob(file), `${doc.fileBase}.docx`);
}
