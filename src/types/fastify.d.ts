import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    cookies: { [cookieName: string]: string | undefined };
    file?: () => Promise<{
      toBuffer: () => Promise<Buffer>;
      filename: string;
      mimetype: string;
    }>;
  }
}
