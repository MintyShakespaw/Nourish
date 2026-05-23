import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repo.js';
import * as tokenRepo from '../repositories/token.repo.js';
import {
  generateAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from '../services/auth.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userRepo.create({ email, passwordHash });

  const accessToken = generateAccessToken(user.id);
  const { raw: refreshToken, hash: refreshHash } = generateRefreshToken();
  await tokenRepo.createRefreshToken({
    userId: user.id,
    tokenHash: refreshHash,
    expiresAt: refreshTokenExpiry(),
  });

  res.status(201).json({ accessToken, refreshToken });
}
