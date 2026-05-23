import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ACCESS_TOKEN_EXPIRY = '15m'; // D-02
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // D-02

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = bcrypt.hashSync(raw, 10);
  return { raw, hash };
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as { sub: string };
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}
