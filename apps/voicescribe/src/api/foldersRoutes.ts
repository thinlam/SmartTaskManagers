import { Router } from 'express';
import type { Db } from '../db/pool.js';
import { userIdOf } from '../auth/middleware.js';
import { isUuid } from '../utils/validation.js';

interface FolderRow {
  id: string;
  name: string;
  created_at: Date;
  recording_count: string;
}

function toDto(f: FolderRow) {
  return { id: f.id, name: f.name, createdAt: f.created_at, recordingCount: Number(f.recording_count) };
}

function cleanName(value: unknown): string | null {
  const name = typeof value === 'string' ? value.trim() : '';
  return name && name.length <= 60 ? name : null;
}

const DUPLICATE = 'Đã có thư mục tên này.';
const BAD_NAME = 'Tên thư mục là bắt buộc (tối đa 60 ký tự).';

const SELECT_WITH_COUNT = `
  SELECT f.id, f.name, f.created_at,
         (SELECT count(*) FROM recordings r WHERE r.folder_id = f.id) AS recording_count
  FROM folders f`;

export function createFoldersRouter(db: Db): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const { rows } = await db.query<FolderRow>(
      `${SELECT_WITH_COUNT} WHERE f.user_id = $1 ORDER BY lower(f.name)`,
      [userIdOf(res)],
    );
    res.json(rows.map(toDto));
  });

  router.post('/', async (req, res) => {
    const name = cleanName(req.body?.name);
    if (!name) {
      res.status(400).json({ error: BAD_NAME });
      return;
    }
    try {
      const { rows } = await db.query<{ id: string }>(
        'INSERT INTO folders (user_id, name) VALUES ($1, $2) RETURNING id',
        [userIdOf(res), name],
      );
      const created = await db.query<FolderRow>(`${SELECT_WITH_COUNT} WHERE f.id = $1`, [rows[0]!.id]);
      res.status(201).json(toDto(created.rows[0]!));
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        res.status(409).json({ error: DUPLICATE });
        return;
      }
      throw err;
    }
  });

  router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const name = cleanName(req.body?.name);
    if (!isUuid(id)) {
      res.status(404).json({ error: 'Không tìm thấy thư mục.' });
      return;
    }
    if (!name) {
      res.status(400).json({ error: BAD_NAME });
      return;
    }
    try {
      const { rowCount } = await db.query(
        'UPDATE folders SET name = $3 WHERE id = $1 AND user_id = $2',
        [id, userIdOf(res), name],
      );
      if (!rowCount) {
        res.status(404).json({ error: 'Không tìm thấy thư mục.' });
        return;
      }
      const updated = await db.query<FolderRow>(`${SELECT_WITH_COUNT} WHERE f.id = $1`, [id]);
      res.json(toDto(updated.rows[0]!));
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        res.status(409).json({ error: DUPLICATE });
        return;
      }
      throw err;
    }
  });

  // Recordings in the folder are kept (folder_id becomes NULL), never deleted with it.
  router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(404).json({ error: 'Không tìm thấy thư mục.' });
      return;
    }
    const { rowCount } = await db.query('DELETE FROM folders WHERE id = $1 AND user_id = $2', [
      id,
      userIdOf(res),
    ]);
    if (!rowCount) {
      res.status(404).json({ error: 'Không tìm thấy thư mục.' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
