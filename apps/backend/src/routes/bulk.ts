import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const RowSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
});

const BulkSchema = z.array(RowSchema).min(1).max(500);

router.post('/', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const parsed = BulkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const rows = parsed.data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const row of rows) {
      await client.query(
        `INSERT INTO defects (title, description, severity, status, reported_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.title, row.description, row.severity, row.status, req.user!.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ inserted: rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
