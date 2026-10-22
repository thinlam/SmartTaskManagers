import jwt from 'jsonwebtoken';

const EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;

export function signToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, { subject: userId, expiresIn: EXPIRES_IN_SECONDS, algorithm: 'HS256' });
}

/** Returns the user id, or null for a missing/invalid/expired token. */
export function verifyToken(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
