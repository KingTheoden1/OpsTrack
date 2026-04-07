import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { migrate } from './db';
import authRouter from './routes/auth';
import defectsRouter from './routes/defects';
import assetsRouter from './routes/assets';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/defects', defectsRouter);
app.use('/api/assets', assetsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await migrate();
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch(console.error);
