import { FastifyPluginAsync } from 'fastify';
import { workflowService } from './workflows.service';

const workflowsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create workflow
  fastify.post('/workflows', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const user = request.user;
      const body = request.body as any;

      try {
        const workflow = await workflowService.createWorkflow({
          userId: user.id,
          name: body.name,
          description: body.description,
          isActive: body.isActive || false,
          trigger: body.trigger,
          steps: body.steps
        });

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_CREATE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // List workflows
  fastify.get('/workflows', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const user = request.user;
      const query = request.query as any;

      const workflows = await workflowService.listWorkflows(user.id, {
        isActive: query.isActive ? query.isActive === 'true' : undefined
      });

      return reply.send({
        success: true,
        data: workflows
      });
    }
  });

  // Get workflow
  fastify.get('/workflows/:id', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const workflow = await workflowService.getWorkflow(id);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error: any) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: error.message
          }
        });
      }
    }
  });

  // Update workflow
  fastify.patch('/workflows/:id', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      try {
        const workflow = await workflowService.updateWorkflow(id, body);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_UPDATE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Delete workflow
  fastify.delete('/workflows/:id', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        await workflowService.deleteWorkflow(id);

        return reply.send({
          success: true,
          data: { deleted: true }
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_DELETE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Activate workflow
  fastify.post('/workflows/:id/activate', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const workflow = await workflowService.activateWorkflow(id);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_ACTIVATE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Deactivate workflow
  fastify.post('/workflows/:id/deactivate', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const workflow = await workflowService.deactivateWorkflow(id);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_DEACTIVATE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Trigger workflow for contact
  fastify.post('/workflows/:id/trigger', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      try {
        const execution = await workflowService.triggerWorkflow(
          id,
          body.contactId,
          body.variables || {}
        );

        return reply.send({
          success: true,
          data: execution
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'WORKFLOW_TRIGGER_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Get execution
  fastify.get('/workflows/executions/:id', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const execution = await workflowService.getExecution(id);

        return reply.send({
          success: true,
          data: execution
        });
      } catch (error: any) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'EXECUTION_NOT_FOUND',
            message: error.message
          }
        });
      }
    }
  });

  // List executions
  fastify.get('/workflows/executions', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const query = request.query as any;

      const executions = await workflowService.listExecutions({
        workflowId: query.workflowId,
        contactId: query.contactId,
        status: query.status,
        limit: query.limit ? parseInt(query.limit) : 50
      });

      return reply.send({
        success: true,
        data: executions
      });
    }
  });

  // Pause execution
  fastify.post('/workflows/executions/:id/pause', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const execution = await workflowService.pauseExecution(id);

        return reply.send({
          success: true,
          data: execution
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'EXECUTION_PAUSE_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Resume execution
  fastify.post('/workflows/executions/:id/resume', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const execution = await workflowService.resumeExecution(id);

        return reply.send({
          success: true,
          data: execution
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'EXECUTION_RESUME_FAILED',
            message: error.message
          }
        });
      }
    }
  });

  // Cancel execution
  fastify.post('/workflows/executions/:id/cancel', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const execution = await workflowService.cancelExecution(id);

        return reply.send({
          success: true,
          data: execution
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'EXECUTION_CANCEL_FAILED',
            message: error.message
          }
        });
      }
    }
  });
};

export default workflowsRoutes;
