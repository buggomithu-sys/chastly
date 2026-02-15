# Workflow Automation Engine Design

## Overview
The Workflow Automation Engine is the core component that enables users to create sophisticated multi-step marketing automation sequences with conditional logic, delays, and multi-channel messaging.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Builder UI                          │
│  - Visual drag-and-drop interface                               │
│  - Step configuration                                           │
│  - Condition builder                                            │
│  - Template selector                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (JSON Workflow Definition)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Workflow Definition Storage                    │
│  - Workflow schema validation                                   │
│  - Version control                                              │
│  - Template library                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (Trigger Event)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Workflow Execution Engine                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Trigger Handler                                         │  │
│  │  - Event detection                                       │  │
│  │  - Execution initialization                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step Processor                                          │  │
│  │  - Execute current step                                  │  │
│  │  - Update state                                          │  │
│  │  - Schedule next step                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Condition Evaluator                                     │  │
│  │  - Evaluate boolean expressions                          │  │
│  │  - Branch routing                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  State Manager                                           │  │
│  │  - Per-contact execution state                           │  │
│  │  - Resume handling                                       │  │
│  │  - Rollback support                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ (Action Execution)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Action Executors                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Send Message │  │   Wait/Delay │  │  Update Tag  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ AI Analysis  │  │ Create Lead  │  │ Send Payment │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Definition Schema

### Basic Structure
```typescript
interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowTrigger {
  type: 'tag_added' | 'tag_removed' | 'form_submit' | 'api_call' | 
        'message_received' | 'time_based' | 'manual';
  conditions?: TriggerCondition[];
  data?: Record<string, any>;
}

interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

interface WorkflowStep {
  id: string;
  type: StepType;
  config: StepConfig;
  nextStepId?: string;
  conditions?: ConditionalBranch[];
}

type StepType = 
  | 'send_email'
  | 'send_whatsapp'
  | 'send_sms'
  | 'send_telegram'
  | 'wait'
  | 'condition'
  | 'add_tag'
  | 'remove_tag'
  | 'update_contact'
  | 'ai_analyze'
  | 'send_payment_link'
  | 'create_task'
  | 'webhook';

interface StepConfig {
  // Varies by step type
  [key: string]: any;
}

interface ConditionalBranch {
  condition: Expression;
  trueSteps?: string[];
  falseSteps?: string[];
}

interface Expression {
  field: string;
  operator: ComparisonOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
  nested?: Expression[];
}

type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';
```

### Example Workflow Definition

```json
{
  "id": "wf_abc123",
  "userId": "user_123",
  "name": "New Lead Nurture Sequence",
  "description": "7-day nurture sequence for new leads",
  "isActive": true,
  "trigger": {
    "type": "tag_added",
    "conditions": [
      {
        "field": "tag",
        "operator": "equals",
        "value": "new_lead"
      }
    ]
  },
  "steps": [
    {
      "id": "step_1",
      "type": "send_email",
      "config": {
        "templateId": "welcome_email",
        "subject": "Welcome to Our Platform!",
        "body": "Hi {name}, welcome aboard!",
        "delaySeconds": 0
      },
      "nextStepId": "step_2"
    },
    {
      "id": "step_2",
      "type": "wait",
      "config": {
        "duration": 172800,
        "unit": "seconds"
      },
      "nextStepId": "step_3"
    },
    {
      "id": "step_3",
      "type": "send_whatsapp",
      "config": {
        "template": "Hi {name}, did you have a chance to explore our platform?",
        "delaySeconds": 0
      },
      "nextStepId": "step_4"
    },
    {
      "id": "step_4",
      "type": "wait",
      "config": {
        "duration": 86400,
        "unit": "seconds"
      },
      "nextStepId": "step_5"
    },
    {
      "id": "step_5",
      "type": "condition",
      "config": {
        "conditions": [
          {
            "condition": {
              "field": "reply_received",
              "operator": "equals",
              "value": true
            },
            "trueSteps": ["step_6"],
            "falseSteps": ["step_7"]
          }
        ]
      }
    },
    {
      "id": "step_6",
      "type": "send_email",
      "config": {
        "subject": "Thanks for your interest!",
        "body": "Great to hear from you! Here's our pricing..."
      },
      "nextStepId": null
    },
    {
      "id": "step_7",
      "type": "send_sms",
      "config": {
        "template": "Still interested in our platform? Reply YES for pricing."
      },
      "nextStepId": "step_8"
    },
    {
      "id": "step_8",
      "type": "wait",
      "config": {
        "duration": 432000,
        "unit": "seconds"
      },
      "nextStepId": "step_9"
    },
    {
      "id": "step_9",
      "type": "add_tag",
      "config": {
        "tag": "cold_lead"
      },
      "nextStepId": null
    }
  ]
}
```

## Execution Engine

### Execution State Machine

```
┌─────────────┐
│   CREATED   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   RUNNING   │◄─────┐
└──────┬──────┘      │
       │             │
       ├─────────────┘ (Next Step)
       │
       ├──────────────► ┌─────────┐
       │                │ WAITING │
       │                └────┬────┘
       │                     │ (Time elapsed)
       │                     └────┐
       │                          │
       ▼                          ▼
┌─────────────┐           ┌─────────────┐
│  COMPLETED  │           │   PAUSED    │
└─────────────┘           └─────────────┘
       │                          │
       ▼                          ▼
┌─────────────┐           ┌─────────────┐
│   FAILED    │           │  CANCELLED  │
└─────────────┘           └─────────────┘
```

### Execution Record Schema

```typescript
interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  status: 'created' | 'running' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStepId: string | null;
  stepData: Record<string, StepExecutionData>;
  variables: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  nextStepAt?: Date;
  errorMessage?: string;
}

interface StepExecutionData {
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount?: number;
}
```

### Step Execution Algorithm

```typescript
async function executeWorkflowStep(
  execution: WorkflowExecution,
  workflow: Workflow,
  step: WorkflowStep
): Promise<void> {
  // 1. Update execution status
  execution.status = 'running';
  execution.currentStepId = step.id;
  
  // 2. Initialize step data
  const stepData: StepExecutionData = {
    status: 'executing',
    startedAt: new Date(),
    retryCount: 0
  };
  
  execution.stepData[step.id] = stepData;
  await saveExecution(execution);
  
  try {
    // 3. Execute step based on type
    const result = await executeStepAction(step, execution);
    
    // 4. Update step data with result
    stepData.status = 'completed';
    stepData.completedAt = new Date();
    stepData.result = result;
    
    // 5. Determine next step
    let nextStepId = step.nextStepId;
    
    // Handle conditional branching
    if (step.type === 'condition' && step.conditions) {
      nextStepId = evaluateConditions(step.conditions, execution);
    }
    
    // 6. Schedule next step or complete
    if (nextStepId) {
      const nextStep = workflow.steps.find(s => s.id === nextStepId);
      
      if (nextStep?.type === 'wait') {
        // Schedule for later
        const waitDuration = nextStep.config.duration;
        execution.status = 'waiting';
        execution.nextStepAt = new Date(Date.now() + waitDuration * 1000);
        execution.currentStepId = nextStep.id;
      } else {
        // Execute immediately (queue it)
        await queueWorkflowStep(execution.id, nextStepId);
      }
    } else {
      // No more steps, mark as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
    }
    
    await saveExecution(execution);
    
  } catch (error) {
    // Handle execution error
    stepData.status = 'failed';
    stepData.error = error.message;
    execution.status = 'failed';
    execution.errorMessage = error.message;
    
    await saveExecution(execution);
    
    // Retry logic
    if (stepData.retryCount < 3) {
      await retryStep(execution.id, step.id);
    }
  }
}
```

### Action Executors

#### Send Message Action
```typescript
async function executeSendMessage(
  step: WorkflowStep,
  execution: WorkflowExecution
): Promise<any> {
  const contact = await getContact(execution.contactId);
  const channel = determineChannel(step.type);
  
  // Apply template variables
  const message = applyTemplateVariables(
    step.config.template || step.config.body,
    contact,
    execution.variables
  );
  
  // Apply anti-spam variation
  const variedMessage = await applyMessageVariation(message);
  
  // Check quota
  await checkAndDecrementQuota(execution.userId, channel);
  
  // Send message
  const result = await sendMessage({
    channel,
    to: getContactIdentifier(contact, channel),
    message: variedMessage,
    subject: step.config.subject
  });
  
  return {
    messageId: result.id,
    sentAt: new Date()
  };
}
```

#### Wait Action
```typescript
async function executeWait(
  step: WorkflowStep,
  execution: WorkflowExecution
): Promise<any> {
  const duration = step.config.duration; // in seconds
  
  // Calculate next execution time
  const nextStepAt = new Date(Date.now() + duration * 1000);
  
  // Update execution
  execution.status = 'waiting';
  execution.nextStepAt = nextStepAt;
  
  return {
    waitUntil: nextStepAt
  };
}
```

#### Condition Action
```typescript
function evaluateConditions(
  conditions: ConditionalBranch[],
  execution: WorkflowExecution
): string | null {
  const contact = execution.variables.contact;
  const stepData = execution.stepData;
  
  for (const branch of conditions) {
    const result = evaluateExpression(branch.condition, {
      contact,
      stepData,
      execution
    });
    
    if (result) {
      return branch.trueSteps?.[0] || null;
    } else {
      return branch.falseSteps?.[0] || null;
    }
  }
  
  return null;
}

function evaluateExpression(
  expr: Expression,
  context: any
): boolean {
  const fieldValue = getFieldValue(expr.field, context);
  
  switch (expr.operator) {
    case 'equals':
      return fieldValue === expr.value;
    case 'not_equals':
      return fieldValue !== expr.value;
    case 'contains':
      return String(fieldValue).includes(expr.value);
    case 'greater_than':
      return Number(fieldValue) > Number(expr.value);
    case 'less_than':
      return Number(fieldValue) < Number(expr.value);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== '';
    default:
      return false;
  }
}
```

#### AI Analysis Action
```typescript
async function executeAIAnalysis(
  step: WorkflowStep,
  execution: WorkflowExecution
): Promise<any> {
  const contact = await getContact(execution.contactId);
  const conversationHistory = await getConversationHistory(contact.id);
  
  const prompt = step.config.prompt || `
    Analyze this contact's behavior and conversation history.
    Contact: ${JSON.stringify(contact)}
    Conversations: ${JSON.stringify(conversationHistory)}
    
    Provide:
    1. Intent (pricing, objection, buy, stop)
    2. Sentiment (positive, neutral, negative)
    3. Lead temperature (hot, warm, cold)
    4. Recommended next action
  `;
  
  const aiResponse = await callOpenAI(prompt);
  
  // Parse AI response
  const analysis = parseAIAnalysis(aiResponse);
  
  // Update contact based on analysis
  await updateContact(contact.id, {
    leadTemperature: analysis.temperature,
    customFields: JSON.stringify({
      ...JSON.parse(contact.customFields || '{}'),
      aiIntent: analysis.intent,
      aiSentiment: analysis.sentiment
    })
  });
  
  return analysis;
}
```

## Trigger System

### Trigger Types

1. **Tag Added/Removed**
   - Fires when a tag is added or removed from a contact
   - Example: Tag "new_lead" added → Start nurture workflow

2. **Form Submit**
   - Fires when a lead form is submitted
   - Example: Contact form → Send welcome email

3. **API Call**
   - External API trigger
   - Example: Webhook from website → Start workflow

4. **Message Received**
   - Fires when contact sends a message
   - Example: Reply "PRICING" → Send pricing workflow

5. **Time-Based**
   - Scheduled trigger
   - Example: Every Monday 9 AM → Send weekly newsletter

6. **Manual**
   - User manually starts workflow for contacts
   - Example: Select contacts → Run revival campaign

### Trigger Handler

```typescript
class WorkflowTriggerHandler {
  async onTagAdded(userId: string, contactId: string, tag: string) {
    const workflows = await getWorkflowsByTrigger(userId, 'tag_added');
    
    for (const workflow of workflows) {
      if (this.matchesTriggerConditions(workflow.trigger, { tag })) {
        await this.startWorkflowExecution(workflow.id, contactId);
      }
    }
  }
  
  async onMessageReceived(contactId: string, message: string, channel: string) {
    const contact = await getContact(contactId);
    const workflows = await getWorkflowsByTrigger(contact.userId, 'message_received');
    
    for (const workflow of workflows) {
      if (this.matchesTriggerConditions(workflow.trigger, { message, channel })) {
        await this.startWorkflowExecution(workflow.id, contactId, { message });
      }
    }
  }
  
  async startWorkflowExecution(
    workflowId: string,
    contactId: string,
    variables: Record<string, any> = {}
  ) {
    const workflow = await getWorkflow(workflowId);
    const contact = await getContact(contactId);
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: generateId(),
      workflowId,
      contactId,
      status: 'created',
      currentStepId: null,
      stepData: {},
      variables: {
        ...variables,
        contact
      },
      startedAt: new Date()
    };
    
    await saveExecution(execution);
    
    // Queue first step
    if (workflow.steps.length > 0) {
      await queueWorkflowStep(execution.id, workflow.steps[0].id);
    }
  }
  
  private matchesTriggerConditions(
    trigger: WorkflowTrigger,
    data: Record<string, any>
  ): boolean {
    if (!trigger.conditions) return true;
    
    return trigger.conditions.every(condition => {
      const value = data[condition.field];
      return this.compareValues(value, condition.operator, condition.value);
    });
  }
  
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'contains': return String(actual).includes(expected);
      case 'greater_than': return Number(actual) > Number(expected);
      case 'less_than': return Number(actual) < Number(expected);
      default: return false;
    }
  }
}
```

## Scheduled Workflow Worker

```typescript
// Worker that processes waiting workflows
class WorkflowSchedulerWorker {
  async processWaitingWorkflows() {
    const now = new Date();
    
    // Get all executions that are waiting and ready to continue
    const readyExecutions = await getExecutionsByStatus('waiting', {
      nextStepAt: { lte: now }
    });
    
    for (const execution of readyExecutions) {
      const workflow = await getWorkflow(execution.workflowId);
      const currentStep = workflow.steps.find(s => s.id === execution.currentStepId);
      
      if (currentStep) {
        // Queue the next step after wait
        const nextStepId = currentStep.nextStepId;
        if (nextStepId) {
          await queueWorkflowStep(execution.id, nextStepId);
        }
      }
    }
  }
  
  async start() {
    // Run every minute
    setInterval(() => this.processWaitingWorkflows(), 60000);
  }
}
```

## Template Variables

### Built-in Variables
- `{name}` - Contact name
- `{email}` - Contact email
- `{phone}` - Contact phone
- `{tag}` - First tag
- `{tags}` - All tags (comma-separated)
- `{custom_field_name}` - Custom field value

### Workflow Variables
- `{workflow.name}` - Workflow name
- `{step.result}` - Previous step result
- `{execution.startedAt}` - Workflow start time

### Dynamic Variables
```typescript
function applyTemplateVariables(
  template: string,
  contact: Contact,
  variables: Record<string, any>
): string {
  let result = template;
  
  // Contact variables
  result = result.replace(/{name}/g, contact.name || 'there');
  result = result.replace(/{email}/g, contact.email || '');
  result = result.replace(/{phone}/g, contact.phone || '');
  
  // Custom fields
  const customFields = JSON.parse(contact.customFields || '{}');
  for (const [key, value] of Object.entries(customFields)) {
    result = result.replace(
      new RegExp(`{${key}}`, 'g'),
      String(value)
    );
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
```

## Performance Optimization

### Execution Batching
- Process multiple waiting workflows in batches
- Parallel execution for independent workflows
- Queue-based processing with priorities

### State Caching
- Cache workflow definitions in Redis
- Cache contact data during execution
- Minimize database queries

### Monitoring
- Track execution times
- Alert on stuck workflows
- Queue depth monitoring

## Error Handling

### Retry Strategy
- Automatic retry with exponential backoff
- Max 3 retries per step
- Dead letter queue for failed executions

### Rollback Support
- Revert contact changes on failure
- Cleanup partial executions
- Manual retry option

## Testing Strategy

### Unit Tests
- Test each action executor
- Test condition evaluation
- Test trigger matching

### Integration Tests
- End-to-end workflow execution
- Multi-step sequences
- Error scenarios

### Load Tests
- 10,000 concurrent executions
- Large workflow (50+ steps)
- High-frequency triggers

## UI/UX Considerations

### Visual Workflow Builder
- Drag-and-drop interface (like Zapier)
- Step library
- Connection lines
- Conditional branching visualization
- Real-time validation

### Execution Monitoring
- Live execution view
- Per-contact execution history
- Success/failure rates
- Average completion time

### Templates
- Pre-built workflow templates
- Community marketplace
- One-click import

## Security

### Access Control
- User can only access own workflows
- Team member permissions
- Audit log for all workflow changes

### Data Privacy
- No logging of message content
- Encrypted variable storage
- GDPR-compliant deletion

## Scalability

### Horizontal Scaling
- Stateless execution engine
- Queue-based distribution
- Multiple worker processes

### Database Optimization
- Index on nextStepAt for fast queries
- Partition executions by date
- Archive completed executions

### Performance Targets
- 1000 executions/second
- < 100ms step execution time
- 99.9% success rate
