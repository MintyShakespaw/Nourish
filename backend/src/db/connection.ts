import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema, logger: env.NODE_ENV === 'development' });
export { pool };
