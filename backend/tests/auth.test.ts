import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

const app = createApp();

describe('POST /api/auth/register (AUTH-01)', () => {
  it('register: returns 201 and tokens for valid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@test.com', password: 'hunter22' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toMatch(/^eyJ/);
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken).toHaveLength(80); // 40 bytes hex = 80 chars

    const decoded = jwt.verify(res.body.accessToken, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as { sub: string };
    expect(decoded.sub).toBeTruthy();
  });

  it('duplicate email: returns 409', async () => {
    await request(app).post('/api/auth/register').send({ email: 'b@test.com', password: 'hunter22' });
    const res = await request(app).post('/api/auth/register').send({ email: 'b@test.com', password: 'hunter22' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });

  it('invalid email: returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'hunter22' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });

  it('short password: returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'c@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('persisted password is bcrypt-hashed (never plaintext)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'd@test.com', password: 'hunter22' });
    expect(res.status).toBe(201);
    const { pool } = await import('../src/db/connection.js');
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['d@test.com']);
    expect(rows[0].password_hash).toMatch(/^\$2[ayb]\$/);
    expect(rows[0].password_hash).not.toBe('hunter22');
  });

  it('persisted refresh token is bcrypt-hashed (never raw)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'e@test.com', password: 'hunter22' });
    const { pool } = await import('../src/db/connection.js');
    const { rows } = await pool.query(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      ['e@test.com']
    );
    expect(rows[0].token_hash).toMatch(/^\$2[ayb]\$/);
    expect(rows[0].token_hash).not.toBe(res.body.refreshToken);
  });
});
