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

export default router;
