import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue';
import { prisma } from '../lib/prisma';
import { workflowService } from '../modules/workflows/workflows.service';
import { processMessage } from '../modules/messages/messages.service';

interface WorkflowStepJobData {
  executionId: string;
  stepId: string;
  variables?: Record<string, any>;
}

// Execute workflow step
async function executeWorkflowStep(job: Job<WorkflowStepJobData>) {
  const { executionId, stepId, variables } = job.data;

  console.log(`[Workflow Worker] Processing step ${stepId} for execution ${executionId}`);

  // Get execution and workflow
  const execution = await workflowService.getExecution(executionId);
  
  if (execution.status !== 'running') {
    console.log(`[Workflow Worker] Execution ${executionId} is not running (${execution.status})`);
    return;
  }

  const workflow = execution.workflow;
  const step = workflow.steps.find((s: any) => s.id === stepId);

  if (!step) {
    throw new Error(`Step ${stepId} not found in workflow`);
  }

  try {
    let stepResult: any = null;

    // Execute step based on type
    switch (step.type) {
      case 'send_email':
        stepResult = await executeSendEmail(step, execution, variables);
        break;
      
      case 'send_whatsapp':
        stepResult = await executeSendWhatsApp(step, execution, variables);
        break;
      
      case 'send_sms':
        stepResult = await executeSendSMS(step, execution, variables);
        break;
      
      case 'send_telegram':
        stepResult = await executeSendTelegram(step, execution, variables);
        break;
      
      case 'wait':
        stepResult = await executeWait(step, execution);
        break;
      
      case 'condition':
        stepResult = await executeCondition(step, execution, variables);
        break;
      
      case 'add_tag':
        stepResult = await executeAddTag(step, execution);
        break;
      
      case 'remove_tag':
        stepResult = await executeRemoveTag(step, execution);
        break;
      
      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }

    // Update step data in execution
    const currentStepData = JSON.parse(execution.stepData || '{}');
    currentStepData[stepId] = {
      status: 'completed',
      completedAt: new Date(),
      result: stepResult,
    };

    // Determine next step
    let nextStepId = step.nextStepId;

    // For condition steps, next step is determined by condition result
    if (step.type === 'condition' && stepResult.nextStepId) {
      nextStepId = stepResult.nextStepId;
    }

    if (nextStepId) {
      const nextStep = workflow.steps.find((s: any) => s.id === nextStepId);
      
      if (nextStep) {
        if (nextStep.type === 'wait') {
          // Schedule for later
          const waitDuration = nextStep.config.duration;
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: 'waiting',
              nextStepAt: new Date(Date.now() + waitDuration * 1000),
              currentStep: workflow.steps.indexOf(nextStep),
              stepData: JSON.stringify(currentStepData),
            },
          });
        } else {
          // Queue next step immediately
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              currentStep: workflow.steps.indexOf(nextStep),
              stepData: JSON.stringify(currentStepData),
            },
          });
          
          // Queue next step (in production, use BullMQ)
          console.log(`[Workflow Worker] Queueing next step: ${nextStepId}`);
          // await workflowQueue.add('execute-step', {
          //   executionId,
          //   stepId: nextStepId,
          //   variables: { ...variables, ...stepResult },
          // });
        }
      }
    } else {
      // No more steps, mark as completed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          stepData: JSON.stringify(currentStepData),
        },
      });
      console.log(`[Workflow Worker] Execution ${executionId} completed`);
    }
  } catch (error: any) {
    console.error(`[Workflow Worker] Error executing step ${stepId}:`, error);
    
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        stepData: JSON.stringify({
          ...JSON.parse(execution.stepData || '{}'),
          [stepId]: {
            status: 'failed',
            error: error.message,
          },
        }),
      },
    });
    
    throw error;
  }
}

// Step executor functions
async function executeSendEmail(step: any, execution: any, variables: any) {
  const contact = execution.contact;
  const message = workflowService.applyTemplateVariables(
    step.config.body || '',
    contact,
    variables || {}
  );
  const subject = workflowService.applyTemplateVariables(
    step.config.subject || 'Message',
    contact,
    variables || {}
  );

  if (!contact.email) {
    throw new Error('Contact does not have an email address');
  }

  await processMessage({
    channel: 'EMAIL',
    to: contact.email,
    content: message,
    subject,
    userId: execution.workflow.userId,
  });

  return {
    sentAt: new Date(),
    channel: 'EMAIL',
    to: contact.email,
  };
}

async function executeSendWhatsApp(step: any, execution: any, variables: any) {
  const contact = execution.contact;
  const message = workflowService.applyTemplateVariables(
    step.config.template || step.config.message || '',
    contact,
    variables || {}
  );

  if (!contact.phone) {
    throw new Error('Contact does not have a phone number');
  }

  await processMessage({
    channel: 'WHATSAPP',
    to: contact.phone,
    content: message,
    userId: execution.workflow.userId,
  });

  return {
    sentAt: new Date(),
    channel: 'WHATSAPP',
    to: contact.phone,
  };
}

async function executeSendSMS(step: any, execution: any, variables: any) {
  const contact = execution.contact;
  const message = workflowService.applyTemplateVariables(
    step.config.template || step.config.message || '',
    contact,
    variables || {}
  );

  if (!contact.phone) {
    throw new Error('Contact does not have a phone number');
  }

  await processMessage({
    channel: 'SMS',
    to: contact.phone,
    content: message,
    userId: execution.workflow.userId,
  });

  return {
    sentAt: new Date(),
    channel: 'SMS',
    to: contact.phone,
  };
}

async function executeSendTelegram(step: any, execution: any, variables: any) {
  const contact = execution.contact;
  const message = workflowService.applyTemplateVariables(
    step.config.template || step.config.message || '',
    contact,
    variables || {}
  );

  if (!contact.telegramId) {
    throw new Error('Contact does not have a Telegram ID');
  }

  await processMessage({
    channel: 'TELEGRAM',
    to: contact.telegramId,
    content: message,
    userId: execution.workflow.userId,
  });

  return {
    sentAt: new Date(),
    channel: 'TELEGRAM',
    to: contact.telegramId,
  };
}

async function executeWait(step: any, execution: any) {
  const duration = step.config.duration; // in seconds
  const nextStepAt = new Date(Date.now() + duration * 1000);

  return {
    waitUntil: nextStepAt,
  };
}

async function executeCondition(step: any, execution: any, variables: any) {
  const contact = execution.contact;
  const stepData = JSON.parse(execution.stepData || '{}');

  // Evaluate conditions
  for (const branch of step.conditions || []) {
    const result = workflowService.evaluateExpression(branch.condition, {
      contact,
      stepData,
      execution,
      variables,
    });

    if (result) {
      // Condition is true, use true path
      return {
        conditionResult: true,
        nextStepId: branch.trueSteps?.[0] || null,
      };
    }
  }

  // All conditions were false, use false path of last condition
  const lastBranch = step.conditions?.[step.conditions.length - 1];
  return {
    conditionResult: false,
    nextStepId: lastBranch?.falseSteps?.[0] || null,
  };
}

async function executeAddTag(step: any, execution: any) {
  const contact = execution.contact;
  const tag = step.config.tag;

  if (!contact.tags.includes(tag)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: {
          push: tag,
        },
      },
    });
  }

  return {
    tagAdded: tag,
  };
}

async function executeRemoveTag(step: any, execution: any) {
  const contact = execution.contact;
  const tag = step.config.tag;

  const updatedTags = contact.tags.filter((t: string) => t !== tag);

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: updatedTags,
    },
  });

  return {
    tagRemoved: tag,
  };
}

// Scheduler worker - processes waiting workflows
async function processScheduledWorkflows() {
  const now = new Date();

  const readyExecutions = await prisma.workflowExecution.findMany({
    where: {
      status: 'waiting',
      nextStepAt: {
        lte: now,
      },
    },
    include: {
      workflow: true,
      contact: true,
    },
  });

  for (const execution of readyExecutions) {
    const workflow = {
      ...execution.workflow,
      trigger: JSON.parse(execution.workflow.trigger),
      steps: JSON.parse(execution.workflow.steps),
    };

    const currentStepId = workflow.steps[execution.currentStep]?.id;

    if (currentStepId) {
      console.log(`[Workflow Scheduler] Queueing step ${currentStepId} for execution ${execution.id}`);
      
      // Update status to running
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'running',
          nextStepAt: null,
        },
      });

      // Queue step (in production, use BullMQ)
      // await workflowQueue.add('execute-step', {
      //   executionId: execution.id,
      //   stepId: currentStepId,
      //   variables: { contact: execution.contact },
      // });
    }
  }
}

// Start workers (in production, these would be separate processes)
export function startWorkflowWorkers() {
  // Workflow step worker
  const workflowWorker = new Worker(
    'workflow',
    executeWorkflowStep,
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  workflowWorker.on('completed', (job) => {
    console.log(`[Workflow Worker] Job ${job.id} completed`);
  });

  workflowWorker.on('failed', (job, err) => {
    console.error(`[Workflow Worker] Job ${job?.id} failed:`, err);
  });

  // Scheduler - runs every minute to process waiting workflows
  // Use setTimeout pattern to avoid overlapping executions
  let isSchedulerRunning = false;

  const scheduleNext = () => {
    setTimeout(async () => {
      if (isSchedulerRunning) {
        console.warn('[Workflow Scheduler] Previous execution still running, skipping');
        scheduleNext();
        return;
      }

      isSchedulerRunning = true;
      try {
        await processScheduledWorkflows();
      } catch (err) {
        console.error('[Workflow Scheduler] Error:', err);
      } finally {
        isSchedulerRunning = false;
        scheduleNext();
      }
    }, 60000); // Every minute
  };

  scheduleNext();

  console.log('[Workflow Workers] Started');
}

export { executeWorkflowStep, processScheduledWorkflows };
