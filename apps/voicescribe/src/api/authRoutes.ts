import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import type { Db } from '../db/pool.js';
import { requireAuth, userIdOf } from '../auth/middleware.js';
import { PASSWORD_RULE_MESSAGE, checkPassword, hashPassword, passwordOk } from '../auth/password.js';
import { rateLimit } from '../auth/rateLimit.js';
import { signToken } from '../auth/token.js';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: Date;
}

function toUserDto(u: UserRow) {
  return { id: u.id, email: u.email, fullName: u.full_name, createdAt: u.created_at };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function createAuthRouter(config: AppConfig, db: Db): Router {
  const router = Router();
  const auth = requireAuth(config.jwtSecret);
  const credentialLimit = rateLimit(20, 15 * 60 * 1000);

  // Public: lets the sign-up form know whether to ask for an invite code.
  router.get('/config', (_req, res) => {
    res.json({ signupCodeRequired: config.signupCode !== undefined });
  });

  router.post('/auth/register', credentialLimit, async (req, res) => {
    const email = str(req.body?.email).trim().toLowerCase();
    const fullName = str(req.body?.fullName).trim();
    const password = req.body?.password;

    if (config.signupCode !== undefined && str(req.body?.signupCode).trim() !== config.signupCode) {
      res.status(403).json({ error: 'Mã mời không đúng.' });
      return;
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      res.status(400).json({ error: 'Email không hợp lệ.' });
      return;
    }
    if (!fullName || fullName.length > 100) {
      res.status(400).json({ error: 'Họ tên là bắt buộc (tối đa 100 ký tự).' });
      return;
    }
    if (!passwordOk(password)) {
      res.status(400).json({ error: PASSWORD_RULE_MESSAGE });
      return;
    }

    const hash = await hashPassword(password);
    try {
      const { rows } = await db.query<UserRow>(
        'INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [email, fullName, hash],
      );
      const user = rows[0]!;
      res.status(201).json({ token: signToken(user.id, config.jwtSecret), user: toUserDto(user) });
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        res.status(409).json({ error: 'Email này đã được đăng ký.' });
        return;
      }
      throw err;
    }
  });

  router.post('/auth/login', credentialLimit, async (req, res) => {
    const email = str(req.body?.email).trim().toLowerCase();
    const password = str(req.body?.password);
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    // Same message for unknown email and wrong password so accounts cannot be enumerated.
    if (!user || !(await checkPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
      return;
    }
    res.json({ token: signToken(user.id, config.jwtSecret), user: toUserDto(user) });
  });

  router.get('/auth/me', auth, async (_req, res) => {
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [userIdOf(res)]);
    if (!rows[0]) {
      res.status(401).json({ error: 'Tài khoản không còn tồn tại.' });
      return;
    }
    res.json(toUserDto(rows[0]));
  });

  router.put('/auth/me', auth, async (req, res) => {
    const fullName = str(req.body?.fullName).trim();
    if (!fullName || fullName.length > 100) {
      res.status(400).json({ error: 'Họ tên là bắt buộc (tối đa 100 ký tự).' });
      return;
    }
    const { rows } = await db.query<UserRow>(
      'UPDATE users SET full_name = $2 WHERE id = $1 RETURNING *',
      [userIdOf(res), fullName],
    );
    res.json(toUserDto(rows[0]!));
  });

  router.put('/auth/password', auth, credentialLimit, async (req, res) => {
    const current = str(req.body?.currentPassword);
    const next = req.body?.newPassword;
    if (!passwordOk(next)) {
      res.status(400).json({ error: PASSWORD_RULE_MESSAGE });
      return;
    }
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [userIdOf(res)]);
    const user = rows[0];
    if (!user || !(await checkPassword(current, user.password_hash))) {
      res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
      return;
    }
    await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
      user.id,
      await hashPassword(next),
    ]);
    res.status(204).end();
  });

  return router;
}
