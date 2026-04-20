import request from 'supertest';
import app from '../../app';
import { signToken } from '../../middleware/auth';

jest.mock('../../db', () => ({
  pool: { query: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pool } = require('../../db') as { pool: { query: jest.Mock } };

// Convenience token factories
const adminToken = () => signToken({ id: 1, email: 'admin@ops.com', role: 'admin' });
const supervisorToken = () => signToken({ id: 2, email: 'sup@ops.com', role: 'supervisor' });
const viewerToken = () => signToken({ id: 3, email: 'viewer@ops.com', role: 'viewer' });

const sampleDefect = {
  id: 1,
  title: 'Hydraulic leak',
  description: 'Fluid seeping from fitting',
  severity: 'critical',
  status: 'open',
  reported_by: 1,
  asset_id: null,
  assigned_to: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  reporter_email: 'admin@ops.com',
};

beforeEach(() => jest.clearAllMocks());

// ─── Authentication guard ─────────────────────────────────────────────────────

describe('GET /api/defects — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/defects');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/defects')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid viewer token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [sampleDefect] });

    const res = await request(app)
      .get('/api/defects')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── GET /api/defects ─────────────────────────────────────────────────────────

describe('GET /api/defects', () => {
  it('returns all defects as an array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [sampleDefect] });

    const res = await request(app)
      .get('/api/defects')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Hydraulic leak');
  });
});

// ─── POST /api/defects — role guard ──────────────────────────────────────────

describe('POST /api/defects — role guard', () => {
  const payload = {
    title: 'New defect',
    description: 'Some description here',
    severity: 'high',
    status: 'open',
  };

  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/defects')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send(payload);

    expect(res.status).toBe(403);
  });

  it('returns 201 for admin role', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...sampleDefect, ...payload }] });

    const res = await request(app)
      .post('/api/defects')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(payload);

    expect(res.status).toBe(201);
  });

  it('returns 201 for supervisor role', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...sampleDefect, ...payload }] });

    const res = await request(app)
      .post('/api/defects')
      .set('Authorization', `Bearer ${supervisorToken()}`)
      .send(payload);

    expect(res.status).toBe(201);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/defects')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/defects/:id — admin-only ────────────────────────────────────

describe('DELETE /api/defects/:id — role guard', () => {
  it('returns 403 for supervisor role', async () => {
    const res = await request(app)
      .delete('/api/defects/1')
      .set('Authorization', `Bearer ${supervisorToken()}`);

    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .delete('/api/defects/1')
      .set('Authorization', `Bearer ${viewerToken()}`);

    expect(res.status).toBe(403);
  });

  it('returns 204 for admin role', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/defects/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(204);
  });
});

// ─── PATCH /api/defects/:id ───────────────────────────────────────────────────

describe('PATCH /api/defects/:id', () => {
  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .patch('/api/defects/1')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ status: 'resolved' });

    expect(res.status).toBe(403);
  });

  it('returns 200 for admin updating a defect', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ ...sampleDefect, status: 'resolved' }],
    });

    const res = await request(app)
      .patch('/api/defects/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });

  it('returns 404 when the defect does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/api/defects/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'closed' });

    expect(res.status).toBe(404);
  });
});
