import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Db } from '../db/pool.js';
import { userIdOf } from '../auth/middleware.js';
import {
  RECORDING_SELECT,
  toDetailDto,
  type RecordingNote,
  type RecordingRow,
} from '../services/recordings.js';
import { isUuid } from '../utils/validation.js';

const NOT_FOUND = { error: 'Không tìm thấy bản ghi.' };
const MAX_PAGE_SIZE = 50;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function parseNotes(value: unknown): RecordingNote[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const notes: RecordingNote[] = [];
  for (const raw of value) {
    const item = raw as Partial<RecordingNote> | null;
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!text || text.length > 2000) return null;
    notes.push({
      id: typeof item?.id === 'string' && item.id ? item.id.slice(0, 64) : randomUUID(),
      text,
      createdAt:
        typeof item?.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
          ? item.createdAt
          : new Date().toISOString(),
    });
  }
  return notes;
}

function parseSpeakerNames(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 50) return null;
  const names: Record<string, string> = {};
  for (const [key, name] of entries) {
    if (typeof name !== 'string' || key.length > 60) return null;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return null;
    names[key] = trimmed;
  }
  return names;
}

export function createRecordingsRouter(db: Db): Router {
  const router = Router();

  router.get('/stats', async (_req, res) => {
    const { rows } = await db.query<{ count: string; total_sec: number | null }>(
      'SELECT count(*) AS count, sum(duration_sec) AS total_sec FROM recordings WHERE user_id = $1',
      [userIdOf(res)],
    );
    res.json({ count: Number(rows[0]!.count), totalDurationSec: rows[0]!.total_sec ?? 0 });
  });

  router.get('/', async (req, res) => {
    const userId = userIdOf(res);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(String(req.query.pageSize ?? '20'), 10) || 20),
    );

    const where = ['r.user_id = $1'];
    const params: unknown[] = [userId];

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      params.push(`%${escapeLike(q)}%`);
      where.push(`(r.title ILIKE $${params.length} OR r.text ILIKE $${params.length})`);
    }

    const folderId = req.query.folderId;
    if (folderId === 'none') {
      where.push('r.folder_id IS NULL');
    } else if (typeof folderId === 'string' && folderId) {
      if (!isUuid(folderId)) {
        res.status(400).json({ error: 'Thư mục không hợp lệ.' });
        return;
      }
      params.push(folderId);
      where.push(`r.folder_id = $${params.length}`);
    }

    const whereSql = where.join(' AND ');
    const total = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM recordings r WHERE ${whereSql}`,
      params,
    );

    params.push(pageSize, (page - 1) * pageSize);
    const { rows } = await db.query(
      `SELECT r.id, r.title, r.file_name, r.folder_id, f.name AS folder_name, r.duration_sec,
              r.created_at, r.diarization_error, left(r.text, 160) AS preview,
              (SELECT count(DISTINCT s->>'speaker') FROM jsonb_array_elements(r.segments) s) AS speaker_count
       FROM recordings r
       LEFT JOIN folders f ON f.id = r.folder_id
       WHERE ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        fileName: r.file_name,
        folderId: r.folder_id,
        folderName: r.folder_name,
        durationSec: r.duration_sec,
        speakerCount: Number(r.speaker_count),
        preview: r.preview,
        createdAt: r.created_at,
      })),
      total: Number(total.rows[0]!.count),
      page,
      pageSize,
    });
  });

  router.get('/:id', async (req, res) => {
    if (!isUuid(req.params.id)) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const { rows } = await db.query<RecordingRow>(
      `${RECORDING_SELECT} WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, userIdOf(res)],
    );
    if (!rows[0]) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json(toDetailDto(rows[0]));
  });

  router.patch('/:id', async (req, res) => {
    const id = req.params.id;
    const userId = userIdOf(res);
    if (!isUuid(id)) {
      res.status(404).json(NOT_FOUND);
      return;
    }

    const sets: string[] = [];
    const params: unknown[] = [id, userId];
    const body = (req.body ?? {}) as Record<string, unknown>;

    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title || title.length > 200) {
        res.status(400).json({ error: 'Tiêu đề là bắt buộc (tối đa 200 ký tự).' });
        return;
      }
      params.push(title);
      sets.push(`title = $${params.length}`);
    }

    if ('folderId' in body) {
      if (body.folderId === null) {
        sets.push('folder_id = NULL');
      } else {
        if (!isUuid(body.folderId)) {
          res.status(400).json({ error: 'Thư mục không hợp lệ.' });
          return;
        }
        const owns = await db.query('SELECT 1 FROM folders WHERE id = $1 AND user_id = $2', [
          body.folderId,
          userId,
        ]);
        if (!owns.rowCount) {
          res.status(400).json({ error: 'Thư mục không tồn tại.' });
          return;
        }
        params.push(body.folderId);
        sets.push(`folder_id = $${params.length}`);
      }
    }

    if ('speakerNames' in body) {
      const names = parseSpeakerNames(body.speakerNames);
      if (!names) {
        res.status(400).json({ error: 'Tên người nói không hợp lệ.' });
        return;
      }
      params.push(JSON.stringify(names));
      sets.push(`speaker_names = $${params.length}`);
    }

    if ('notes' in body) {
      const notes = parseNotes(body.notes);
      if (!notes) {
        res.status(400).json({ error: 'Ghi chú không hợp lệ (tối đa 200 ghi chú, mỗi ghi chú 2000 ký tự).' });
        return;
      }
      params.push(JSON.stringify(notes));
      sets.push(`notes = $${params.length}`);
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'Không có thay đổi nào để lưu.' });
      return;
    }

    const { rowCount } = await db.query(
      `UPDATE recordings SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND user_id = $2`,
      params,
    );
    if (!rowCount) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const { rows } = await db.query<RecordingRow>(`${RECORDING_SELECT} WHERE r.id = $1`, [id]);
    res.json(toDetailDto(rows[0]!));
  });

  router.delete('/:id', async (req, res) => {
    if (!isUuid(req.params.id)) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const { rowCount } = await db.query('DELETE FROM recordings WHERE id = $1 AND user_id = $2', [
      req.params.id,
      userIdOf(res),
    ]);
    if (!rowCount) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.status(204).end();
  });

  return router;
}
