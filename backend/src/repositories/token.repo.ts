import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { refreshTokens } from '../db/schema/users.js';

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const [token] = await db.insert(refreshTokens).values(data).returning();
  return token;
}

export async function findActiveByUser(userId: string) {
  return db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function revokeById(id: string) {
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
}
