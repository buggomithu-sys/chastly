import { FastifyInstance } from 'fastify';
import { registerUser, loginUser, logoutUser, getCurrentUser, registerSchema, loginSchema } from './auth.service';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await registerUser(data);

      reply.setCookie(
        result.sessionCookie.name,
        result.sessionCookie.value,
        result.sessionCookie.attributes
      );

      return reply.code(201).send({
        success: true,
        user: result.user,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message || 'Registration failed',
      });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body);
      const result = await loginUser(data);

      reply.setCookie(
        result.sessionCookie.name,
        result.sessionCookie.value,
        result.sessionCookie.attributes
      );

      return reply.send({
        success: true,
        user: result.user,
      });
    } catch (error: any) {
      return reply.code(401).send({
        success: false,
        error: error.message || 'Login failed',
      });
    }
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies?.lucia_session;
    
    if (sessionId) {
      const cookie = await logoutUser(sessionId);
      reply.setCookie(cookie.name, cookie.value, cookie.attributes);
    }

    return reply.send({
      success: true,
    });
  });

  // Get current user
  fastify.get('/me', async (request, reply) => {
    const sessionId = request.cookies?.lucia_session;
    const user = await getCurrentUser(sessionId);

    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    return reply.send({
      success: true,
      user,
    });
  });
}
