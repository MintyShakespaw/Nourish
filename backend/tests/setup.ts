import 'dotenv/config';
import { afterAll, beforeEach } from 'vitest';
import { pool } from '../src/db/connection.js';

// Wipe auth tables between tests so duplicate-email tests stay isolated.
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE refresh_tokens, password_reset_tokens, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});
