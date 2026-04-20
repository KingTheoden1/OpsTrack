import request from 'supertest';
import app from '../../app';
import { signToken } from '../../middleware/auth';

jest.mock('../../db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pool } = require('../../db') as {
  pool: { query: jest.Mock; connect: jest.Mock };
};

const adminToken = () => signToken({ id: 1, email: 'admin@ops.com', role: 'admin' });
const viewerToken = () => signToken({ id: 3, email: 'viewer@ops.com', role: 'viewer' });

const validRows = [
  { title: 'Defect 1', description: 'Desc 1', severity: 'high', status: 'open' },
  { title: 'Defect 2', description: 'Desc 2', severity: 'medium', status: 'in_progress' },
];

function makeMockClient() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const client = makeMockClient();
  pool.connect.mockResolvedValue(client);
});

// ─── POST /api/defects/bulk ───────────────────────────────────────────────────

describe('POST /api/defects/bulk — auth + role guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/defects/bulk').send(validRows);
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send(validRows);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/defects/bulk — happy path', () => {
  it('returns 201 with inserted count for admin', async () => {
    const res = await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validRows);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 2 });
  });

  it('calls BEGIN and COMMIT within the transaction', async () => {
    const client = makeMockClient();
    pool.connect.mockResolvedValue(client);

    await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validRows);

    const calls = client.query.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('BEGIN');
    expect(calls).toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('inserts one row per entry in the payload', async () => {
    const client = makeMockClient();
    pool.connect.mockResolvedValue(client);

    const rows = Array.from({ length: 5 }, (_, i) => ({
      title: `Defect ${i}`,
      description: `Desc ${i}`,
      severity: 'low',
      status: 'open',
    }));

    await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(rows);

    // BEGIN + 5 inserts + COMMIT = 7 calls
    expect(client.query).toHaveBeenCalledTimes(7);
  });
});

describe('POST /api/defects/bulk — validation', () => {
  it('returns 400 for an empty array', async () => {
    const res = await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([]);

    expect(res.status).toBe(400);
  });

  it('returns 400 when a row is missing the title field', async () => {
    const res = await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([{ description: 'No title', severity: 'low', status: 'open' }]);

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is an invalid enum value', async () => {
    const res = await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([{ title: 'Bad', description: 'Bad', severity: 'extreme', status: 'open' }]);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/defects/bulk — transaction rollback', () => {
  it('calls ROLLBACK and releases the client when an insert fails', async () => {
    const client = makeMockClient();
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('DB insert failed')); // first INSERT
    pool.connect.mockResolvedValue(client);

    await request(app)
      .post('/api/defects/bulk')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validRows);

    const calls = client.query.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
