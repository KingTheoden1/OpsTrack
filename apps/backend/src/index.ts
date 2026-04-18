import { migrate } from './db';
import app from './app';

const PORT = process.env.PORT ?? 3001;

async function start() {
  await migrate();
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch(console.error);
