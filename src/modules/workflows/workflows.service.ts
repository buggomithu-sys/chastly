import { prisma } from '../../lib/prisma';
import { Channel } from '@prisma/client';

export interface WorkflowTrigger {
  type: 'tag_added' | 'tag_removed' | 'form_submit' | 'api_call' | 'message_received' | 'time_based' | 'manual';
  conditions?: TriggerCondition[];
  data?: Record<string, any>;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface WorkflowStep {
  id: string;
  type: 'send_email' | 'send_whatsapp' | 'send_sms' | 'send_telegram' | 'wait' | 'condition' | 'add_tag' | 'remove_tag' | 'update_contact' | 'ai_analyze' | 'send_payment_link' | 'create_task' | 'webhook';
  config: Record<string, any>;
  nextStepId?: string;
  conditions?: ConditionalBranch[];
}

export interface ConditionalBranch {
  condition: Expression;
  trueSteps?: string[];
  falseSteps?: string[];
}

export interface Expression {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
  logicalOperator?: 'AND' | 'OR';
  nested?: Expression[];
}

export interface WorkflowDefinition {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

export class WorkflowService {
  async createWorkflow(data: WorkflowDefinition) {
    const workflow = await prisma.workflow.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        trigger: JSON.stringify(data.trigger),
        steps: JSON.stringify(data.steps)
      }
    });

    return {
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      steps: JSON.parse(workflow.steps)
    };
  }

  async getWorkflow(workflowId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId }
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return {
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      steps: JSON.parse(workflow.steps)
    };
  }

  async listWorkflows(userId: string, filters?: { isActive?: boolean }) {
    const where: any = { userId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return workflows.map(w => ({
      ...w,
      trigger: JSON.parse(w.trigger),
      steps: JSON.parse(w.steps)
    }));
  }

  async updateWorkflow(workflowId: string, data: Partial<WorkflowDefinition>) {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.trigger) updateData.trigger = JSON.stringify(data.trigger);
    if (data.steps) updateData.steps = JSON.stringify(data.steps);

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData
    });

    return {
      ...workflow,
      trigger: JSON.parse(workflow.trigger),
      steps: JSON.parse(workflow.steps)
    };
  }

  async deleteWorkflow(workflowId: string) {
    await prisma.workflow.delete({
      where: { id: workflowId }
    });

    return { deleted: true };
  }

  async activateWorkflow(workflowId: string) {
    return await this.updateWorkflow(workflowId, { isActive: true });
  }

  async deactivateWorkflow(workflowId: string) {
    return await this.updateWorkflow(workflowId, { isActive: false });
  }

  async triggerWorkflow(workflowId: string, contactId: string, variables: Record<string, any> = {}) {
    const workflow = await this.getWorkflow(workflowId);
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        contactId,
        currentStep: 0,
        status: 'running',
        stepData: JSON.stringify({}),
        startedAt: new Date(),
        nextStepAt: null
      }
    });

    // Queue first step
    if (workflow.steps.length > 0) {
      await this.queueWorkflowStep(execution.id, workflow.steps[0].id, {
        ...variables,
        contact
      });
    }

    return execution;
  }

  private async queueWorkflowStep(executionId: string, stepId: string, variables: Record<string, any>) {
    // This would integrate with BullMQ to queue the step
    // For now, we'll import the queue in the actual implementation
    console.log('Queueing workflow step:', { executionId, stepId });
    
    // In production:
    // await workflowQueue.add('execute-step', { executionId, stepId, variables });
  }

  async getExecution(executionId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        contact: true
      }
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    return {
      ...execution,
      workflow: {
        ...execution.workflow,
        trigger: JSON.parse(execution.workflow.trigger),
        steps: JSON.parse(execution.workflow.steps)
      },
      stepData: JSON.parse(execution.stepData || '{}')
    };
  }

  async listExecutions(filters: {
    workflowId?: string;
    contactId?: string;
    status?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.workflowId) where.workflowId = filters.workflowId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.status) where.status = filters.status;

    const executions = await prisma.workflowExecution.findMany({
      where,
      take: filters.limit || 50,
      orderBy: { startedAt: 'desc' },
      include: {
        workflow: true,
        contact: true
      }
    });

    return executions.map(e => ({
      ...e,
      workflow: {
        ...e.workflow,
        trigger: JSON.parse(e.workflow.trigger),
        steps: JSON.parse(e.workflow.steps)
      },
      stepData: JSON.parse(e.stepData || '{}')
    }));
  }

  async pauseExecution(executionId: string) {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'paused' }
    });

    return execution;
  }

  async resumeExecution(executionId: string) {
    const execution = await this.getExecution(executionId);

    if (execution.status !== 'paused') {
      throw new Error('Execution is not paused');
    }

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'running' }
    });

    // Queue next step
    const workflow = execution.workflow;
    const currentStepIndex = execution.currentStep;

    if (currentStepIndex < workflow.steps.length) {
      const step = workflow.steps[currentStepIndex];
      await this.queueWorkflowStep(executionId, step.id, {
        contact: execution.contact
      });
    }

    return execution;
  }

  async cancelExecution(executionId: string) {
    const execution = await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    });

    return execution;
  }

  // Template variables
  applyTemplateVariables(template: string, contact: any, variables: Record<string, any>): string {
    let result = template;

    // Contact variables
    result = result.replace(/{name}/g, contact.name || 'there');
    result = result.replace(/{email}/g, contact.email || '');
    result = result.replace(/{phone}/g, contact.phone || '');

    // Tags
    if (contact.tags && contact.tags.length > 0) {
      result = result.replace(/{tag}/g, contact.tags[0]);
      result = result.replace(/{tags}/g, contact.tags.join(', '));
    }

    // Custom fields
    if (contact.customFields) {
      const customFields = JSON.parse(contact.customFields);
      for (const [key, value] of Object.entries(customFields)) {
        result = result.replace(
          new RegExp(`{${key}}`, 'g'),
          String(value)
        );
      }
    }

    // Workflow variables
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(
        new RegExp(`{${key}}`, 'g'),
        String(value)
      );
    }

    return result;
  }

  // Condition evaluation
  evaluateExpression(expr: Expression, context: any): boolean {
    const fieldValue = this.getFieldValue(expr.field, context);

    let result = false;

    switch (expr.operator) {
      case 'equals':
        result = fieldValue === expr.value;
        break;
      case 'not_equals':
        result = fieldValue !== expr.value;
        break;
      case 'contains':
        result = String(fieldValue).includes(expr.value);
        break;
      case 'not_contains':
        result = !String(fieldValue).includes(expr.value);
        break;
      case 'greater_than':
        result = Number(fieldValue) > Number(expr.value);
        break;
      case 'less_than':
        result = Number(fieldValue) < Number(expr.value);
        break;
      case 'is_empty':
        result = !fieldValue || fieldValue === '';
        break;
      case 'is_not_empty':
        result = !!fieldValue && fieldValue !== '';
        break;
      default:
        result = false;
    }

    // Handle nested expressions with logical operators
    if (expr.nested && expr.nested.length > 0) {
      const nestedResults = expr.nested.map(nested => this.evaluateExpression(nested, context));

      if (expr.logicalOperator === 'AND') {
        result = result && nestedResults.every(r => r);
      } else if (expr.logicalOperator === 'OR') {
        result = result || nestedResults.some(r => r);
      }
    }

    return result;
  }

  private getFieldValue(field: string, context: any): any {
    const parts = field.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

export const workflowService = new WorkflowService();
