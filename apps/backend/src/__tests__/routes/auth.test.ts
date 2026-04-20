import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';
import { pool } from '../../db';

// Mock the database pool so no real PostgreSQL is needed.
jest.mock('../../db', () => ({
  pool: { query: jest.fn() },
}));

const mockPool = pool as unknown as { query: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 201 with token and user on valid data', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'new@ops.com', role: 'viewer' }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@ops.com', password: 'password123', role: 'viewer' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('new@ops.com');
    expect(res.body.user.role).toBe('viewer');
  });

  it('returns 400 when the password is fewer than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad@ops.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the email is malformed', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when the email is already in use', async () => {
    const dbError = Object.assign(new Error('duplicate'), { code: '23505' });
    mockPool.query.mockRejectedValueOnce(dbError);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@ops.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
  });

  it('assigns viewer as the default role when none is specified', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'default@ops.com', role: 'viewer' }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'default@ops.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('viewer');
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with token and user on valid credentials', async () => {
    const hash = await bcrypt.hash('correct_pass', 10);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'login@ops.com', role: 'admin', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@ops.com', password: 'correct_pass' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('login@ops.com');
  });

  it('returns 401 when the user does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@ops.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for a wrong password', async () => {
    const hash = await bcrypt.hash('real_pass', 10);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 4, email: 'wrong@ops.com', role: 'viewer', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@ops.com', password: 'wrong_pass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 400 when the email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
  });
});
