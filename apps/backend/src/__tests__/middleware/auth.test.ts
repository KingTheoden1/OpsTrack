import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, signToken } from '../../middleware/auth';

// JWT_SECRET falls back to 'dev_secret' when env var is unset — all
// sign/verify calls below use the same fallback so they always agree.
const DEV_SECRET = 'dev_secret';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── signToken ───────────────────────────────────────────────────────────────

describe('signToken', () => {
  it('embeds id, email and role in the payload', () => {
    const token = signToken({ id: 42, email: 'test@ops.com', role: 'admin' });
    const decoded = jwt.verify(token, DEV_SECRET) as Record<string, unknown>;
    expect(decoded.id).toBe(42);
    expect(decoded.email).toBe('test@ops.com');
    expect(decoded.role).toBe('admin');
  });

  it('sets a 7-day expiry', () => {
    const token = signToken({ id: 1, email: 'a@b.com', role: 'viewer' });
    const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
    expect(exp - iat).toBe(7 * 24 * 60 * 60);
  });

  it('produces a different token for each role', () => {
    const admin = signToken({ id: 1, email: 'a@b.com', role: 'admin' });
    const viewer = signToken({ id: 1, email: 'a@b.com', role: 'viewer' });
    expect(admin).not.toBe(viewer);
  });
});

// ─── authenticate ────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it('calls next() and attaches user for a valid token', () => {
    const token = signToken({ id: 5, email: 'auth@test.com', role: 'supervisor' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 5, email: 'auth@test.com', role: 'supervisor' });
  });

  it('returns 401 when the Authorization header is missing', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the header does not start with "Bearer "', () => {
    const req = { headers: { authorization: 'Basic somevalue' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a tampered / invalid token', () => {
    const req = { headers: { authorization: 'Bearer not.a.real.token' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const expired = jwt.sign(
      { id: 1, email: 'e@e.com', role: 'viewer' },
      DEV_SECRET,
      { expiresIn: -1 }
    );
    const req = { headers: { authorization: `Bearer ${expired}` } } as Request;
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole middleware', () => {
  function reqWithRole(role: string): Request {
    return { user: { id: 1, email: 'r@r.com', role } } as unknown as Request;
  }

  it('calls next() when the user has an exact role match', () => {
    const next = jest.fn();
    requireRole('admin')(reqWithRole('admin'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when the role is in a multi-role allowlist', () => {
    const next = jest.fn();
    requireRole('admin', 'supervisor')(reqWithRole('supervisor'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 when the user role is not in the allowlist', () => {
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin', 'supervisor')(reqWithRole('viewer'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user is undefined', () => {
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')({} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
