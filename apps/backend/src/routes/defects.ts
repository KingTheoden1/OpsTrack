import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const DefectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  asset_id: z.number().nullable().default(null),
  assigned_to: z.number().nullable().default(null),
});

router.use(authenticate);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `SELECT d.*, u.email AS reporter_email
     FROM defects d
     LEFT JOIN users u ON u.id = d.reported_by
     ORDER BY d.created_at DESC`
  );
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM defects WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.post('/', requireRole('admin', 'supervisor'), async (req, res) => {
  const parsed = DefectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { title, description, severity, status, asset_id, assigned_to } = parsed.data;
  const result = await pool.query(
    `INSERT INTO defects (title, description, severity, status, asset_id, reported_by, assigned_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, description, severity, status, asset_id, req.user!.id, assigned_to]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const parsed = DefectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const fields = Object.entries(parsed.data)
    .map(([key], i) => `${key} = $${i + 2}`)
    .join(', ');
  const values = Object.values(parsed.data);

  if (!fields) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const result = await pool.query(
    `UPDATE defects SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, ...values]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM defects WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
