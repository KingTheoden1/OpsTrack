import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const AssetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  location: z.string().min(1),
});

router.use(authenticate);

router.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM assets ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', requireRole('admin', 'supervisor'), async (req, res) => {
  const parsed = AssetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, type, location } = parsed.data;
  const result = await pool.query(
    'INSERT INTO assets (name, type, location) VALUES ($1, $2, $3) RETURNING *',
    [name, type, location]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const parsed = AssetSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const fields = Object.keys(parsed.data)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  const values = Object.values(parsed.data);

  if (!fields) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const result = await pool.query(
    `UPDATE assets SET ${fields} WHERE id = $1 RETURNING *`,
    [req.params.id, ...values]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
