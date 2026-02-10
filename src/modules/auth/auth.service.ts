import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../../lib/prisma';
import { lucia } from '../../lib/auth';
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export async function registerUser(data: RegisterInput) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hash(data.password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
    },
  });

  // Create session
  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
    sessionCookie: {
      name: sessionCookie.name,
      value: sessionCookie.value,
      attributes: sessionCookie.attributes,
    },
  };
}

export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const validPassword = await verify(user.passwordHash, data.password);

  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
    sessionCookie: {
      name: sessionCookie.name,
      value: sessionCookie.value,
      attributes: sessionCookie.attributes,
    },
  };
}

export async function logoutUser(sessionId: string) {
  await lucia.invalidateSession(sessionId);
  const blankCookie = lucia.createBlankSessionCookie();
  return {
    name: blankCookie.name,
    value: blankCookie.value,
    attributes: blankCookie.attributes,
  };
}

export async function getCurrentUser(sessionId: string | undefined) {
  if (!sessionId) {
    return null;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    dailyQuota: user.dailyQuota,
  };
}
