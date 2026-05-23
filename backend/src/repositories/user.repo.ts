import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema/users.js';

export async function findByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function create(data: { email: string; passwordHash: string }) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
