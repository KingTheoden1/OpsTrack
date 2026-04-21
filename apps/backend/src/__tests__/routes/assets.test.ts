import request from 'supertest';
import app from '../../app';
import { signToken } from '../../middleware/auth';
import { pool } from '../../db';

jest.mock('../../db', () => ({
  pool: { query: jest.fn() },
}));

const mockPool = pool as unknown as { query: jest.Mock };

const adminToken = () => signToken({ id: 1, email: 'admin@ops.com', role: 'admin' });
const supervisorToken = () => signToken({ id: 2, email: 'sup@ops.com', role: 'supervisor' });
const viewerToken = () => signToken({ id: 3, email: 'viewer@ops.com', role: 'viewer' });

const sampleAsset = {
  id: 1,
  name: 'Hydraulic Actuator Unit 4',
  type: 'Hydraulic',
  location: 'Bay 3',
  created_at: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/assets ──────────────────────────────────────────────────────────

describe('GET /api/assets — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid token', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [sampleAsset] });
    const res = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${viewerToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── POST /api/assets ─────────────────────────────────────────────────────────

describe('POST /api/assets — role guard', () => {
  const payload = { name: 'Landing Gear Strut', type: 'Structural', location: 'Frame 12' };

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send(payload);
    expect(res.status).toBe(403);
  });

  it('returns 201 for admin', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2, ...payload }] });
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(payload);
    expect(res.status).toBe(201);
  });

  it('returns 201 for supervisor', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 3, ...payload }] });
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${supervisorToken()}`)
      .send(payload);
    expect(res.status).toBe(201);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/assets/:id ────────────────────────────────────────────────────

describe('PATCH /api/assets/:id — role guard', () => {
  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .patch('/api/assets/1')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ location: 'Bay 5' });
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin updating an asset', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ ...sampleAsset, location: 'Bay 5' }] });
    const res = await request(app)
      .patch('/api/assets/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ location: 'Bay 5' });
    expect(res.status).toBe(200);
    expect(res.body.location).toBe('Bay 5');
  });

  it('returns 404 when the asset does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/assets/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Ghost Asset' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/assets/:id ───────────────────────────────────────────────────

describe('DELETE /api/assets/:id — role guard', () => {
  it('returns 403 for supervisor', async () => {
    const res = await request(app)
      .delete('/api/assets/1')
      .set('Authorization', `Bearer ${supervisorToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .delete('/api/assets/1')
      .set('Authorization', `Bearer ${viewerToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 204 for admin', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete('/api/assets/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
  });
});
