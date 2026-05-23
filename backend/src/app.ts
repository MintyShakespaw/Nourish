import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRouter from './routes/auth.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}
export default createApp();
