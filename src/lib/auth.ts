import { Lucia, Session, User } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from './prisma';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      plan: attributes.plan,
      dailyQuota: attributes.dailyQuota,
    };
  },
});

// Extend Lucia types
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string | null;
      plan: string;
      dailyQuota: number;
    };
  }
}

export type AuthUser = User;
export type AuthSession = Session;

// API Key authentication helper
export async function validateApiKey(apiKey: string): Promise<{ userId: string; permissions: string[] } | null> {
  const { hashApiKey } = await import('./crypto');
  const keyHash = hashApiKey(apiKey);
  
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { keyHash },
  });
  
  if (!apiKeyRecord) {
    return null;
  }
  
  return {
    userId: apiKeyRecord.userId,
    permissions: apiKeyRecord.permissions,
  };
}
