import type { Db } from './pool.js';

interface Migration {
  id: string;
  sql: string;
}

// Append-only: never edit a migration that has shipped, add a new one.
const MIGRATIONS: Migration[] = [
  {
    id: '001_initial',
    sql: `
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email         text NOT NULL UNIQUE,
        full_name     text NOT NULL,
        password_hash text NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE folders (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX folders_user_name_uq ON folders (user_id, lower(name));

      CREATE TABLE recordings (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder_id         uuid REFERENCES folders(id) ON DELETE SET NULL,
        title             text NOT NULL,
        file_name         text NOT NULL,
        duration_sec      real NOT NULL DEFAULT 0,
        text              text NOT NULL DEFAULT '',
        segments          jsonb NOT NULL DEFAULT '[]',
        speaker_names     jsonb NOT NULL DEFAULT '{}',
        notes             jsonb NOT NULL DEFAULT '[]',
        processing_ms     integer NOT NULL DEFAULT 0,
        diarization_error text,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX recordings_user_created_idx ON recordings (user_id, created_at DESC);
      CREATE INDEX recordings_folder_idx ON recordings (folder_id);
    `,
  },
  {
    id: '002_recording_jobs',
    sql: `
      ALTER TABLE recordings
        ADD COLUMN status         text    NOT NULL DEFAULT 'done'
          CHECK (status IN ('processing', 'done', 'failed')),
        ADD COLUMN progress_done  integer NOT NULL DEFAULT 0,
        ADD COLUMN progress_total integer NOT NULL DEFAULT 0,
        ADD COLUMN error          text;
      CREATE INDEX recordings_status_idx ON recordings (user_id, status);
    `,
  },
  {
    id: '003_recording_audio_path',
    sql: `
      ALTER TABLE recordings
        ADD COLUMN audio_path text;
    `,
  },
  {
    id: '004_recording_denoise',
    sql: `
      ALTER TABLE recordings
        ADD COLUMN audio_filtered_path text,
        ADD COLUMN denoise_level text NOT NULL DEFAULT 'off'
          CHECK (denoise_level IN ('off', 'light', 'medium', 'strong'));
    `,
  },
  {
    // Speaker list used to be derived live from `segments`, so a speaker with
    // no segments left (e.g. reassigned away) silently vanished from the
    // picker. This column is the persisted, independent roster of speaker
    // keys for a recording — it only ever grows/shrinks by explicit user
    // action (add/rename/delete), never by re-deriving from segments.
    // Backfill is best-effort: it can only see speakers present in segments
    // *today*, so anyone already lost to the old bug stays lost.
    id: '005_recording_speaker_roster',
    sql: `
      ALTER TABLE recordings ADD COLUMN speaker_roster jsonb NOT NULL DEFAULT '[]';
      UPDATE recordings SET speaker_roster = (
        SELECT coalesce(jsonb_agg(DISTINCT seg->>'speaker'), '[]'::jsonb)
        FROM jsonb_array_elements(segments) seg
      );
    `,
  },
  {
    // Word-level timestamps for the whole recording (see docs/project/plans/
    // 2026-11-09-voicescribe-xoa-doan-moc-tung-tu.md — "Việc B"). Segments
    // reference words by id (segments.wordIds, stored inside the existing
    // `segments` jsonb column — no schema change needed there); a segment
    // without `wordIds` (old recording, or the word-source fell back to
    // approximation and wasn't trusted) keeps using its own start/end as
    // before. No backfill: old recordings simply have an empty word list.
    id: '006_recording_words',
    sql: `ALTER TABLE recordings ADD COLUMN words jsonb NOT NULL DEFAULT '[]';`,
  },
  {
    // Root-cause data fix for "Danh sách đoạn hội thoại không hợp lệ" when
    // naming a speaker (see utils/mergeSpeakers.ts's matching comment):
    // Whisper can hand back a segment with blank/whitespace-only text (pure
    // silence/noise), and until this fix it was stored as-is. The very next
    // segments-touching edit on that recording re-validates the WHOLE array
    // and rejects it outright because of that one pre-existing blank
    // segment — even though the user's actual edit was fine. Strips any
    // already-stored blank-text segment from every recording so existing,
    // already-affected recordings become editable again. New recordings
    // never get one in the first place after the mergeSpeakers.ts fix.
    id: '007_strip_blank_segments',
    sql: `
      UPDATE recordings SET segments = (
        SELECT coalesce(jsonb_agg(seg), '[]'::jsonb)
        FROM jsonb_array_elements(segments) seg
        WHERE btrim(seg->>'text') <> ''
      )
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(segments) seg WHERE btrim(seg->>'text') = ''
      );
    `,
  },
  {
    // Thùng rác: deleting a segment used to drop it outright (only an 8s
    // in-memory "Hoàn tác" toast could bring it back). This column holds
    // soft-deleted segments independently of `segments` — full content,
    // speaker, words and timing kept — until the user restores or
    // permanently deletes them from the trash panel.
    id: '008_recording_trash',
    sql: `ALTER TABLE recordings ADD COLUMN trash jsonb NOT NULL DEFAULT '[]';`,
  },
];

/** Applies pending migrations in order, each in its own transaction. Safe to run on every start. */
export async function migrate(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await db.query<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.id));

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
      await client.query('COMMIT');
      console.log(`[db] applied migration ${m.id}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
