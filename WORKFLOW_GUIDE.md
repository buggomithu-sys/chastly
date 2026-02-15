# Complete Workflow Automation Guide

## Overview
Chastly's workflow automation engine allows you to create sophisticated multi-step marketing sequences with conditional logic, delays, and multi-channel messaging.

## Key Features
- ✅ Multi-channel messaging (Email, WhatsApp, SMS, Telegram)
- ✅ Conditional branching (if/then logic)
- ✅ Time delays (wait steps)
- ✅ Tag management
- ✅ Template variables
- ✅ Per-contact state tracking
- ✅ Pause/Resume/Cancel execution

---

## Workflow Structure

### Basic Workflow
```json
{
  "name": "Welcome Sequence",
  "description": "Onboard new customers",
  "isActive": true,
  "trigger": {
    "type": "tag_added",
    "conditions": [
      {
        "field": "tag",
        "operator": "equals",
        "value": "new_customer"
      }
    ]
  },
  "steps": [
    {
      "id": "step_1",
      "type": "send_email",
      "config": {
        "subject": "Welcome to {company}!",
        "body": "Hi {name},\n\nThank you for joining us!"
      },
      "nextStepId": "step_2"
    },
    {
      "id": "step_2",
      "type": "wait",
      "config": {
        "duration": 86400
      },
      "nextStepId": "step_3"
    },
    {
      "id": "step_3",
      "type": "send_whatsapp",
      "config": {
        "template": "Hi {name}! How are you enjoying our service?"
      },
      "nextStepId": null
    }
  ]
}
```

---

## Step Types

### 1. Send Email
Send an email to the contact.

```json
{
  "id": "email_step",
  "type": "send_email",
  "config": {
    "subject": "Your order is ready!",
    "body": "Hi {name},\n\nYour order #{orderId} is ready for pickup."
  },
  "nextStepId": "next_step"
}
```

**Template Variables:**
- `{name}` - Contact name
- `{email}` - Contact email
- `{phone}` - Contact phone
- `{tag}` - First tag
- Custom fields: `{customField.fieldName}`

### 2. Send WhatsApp
Send a WhatsApp message.

```json
{
  "id": "whatsapp_step",
  "type": "send_whatsapp",
  "config": {
    "template": "Hi {name}! 🎉 Special offer just for you!"
  },
  "nextStepId": "next_step"
}
```

**Supports:**
- Emojis
- Template variables
- Media attachments (configure in integration)

### 3. Send SMS
Send an SMS message.

```json
{
  "id": "sms_step",
  "type": "send_sms",
  "config": {
    "message": "Hi {name}, your verification code is: {code}"
  },
  "nextStepId": "next_step"
}
```

### 4. Send Telegram
Send a Telegram message.

```json
{
  "id": "telegram_step",
  "type": "send_telegram",
  "config": {
    "message": "Hi {name}! Check out our latest update."
  },
  "nextStepId": "next_step"
}
```

### 5. Wait
Pause workflow execution for a specified duration.

```json
{
  "id": "wait_step",
  "type": "wait",
  "config": {
    "duration": 86400
  },
  "nextStepId": "next_step"
}
```

**Duration** (in seconds):
- 1 hour: `3600`
- 1 day: `86400`
- 1 week: `604800`
- 1 month: `2592000`

### 6. Condition
Branch based on contact data or previous step results.

```json
{
  "id": "condition_step",
  "type": "condition",
  "conditions": [
    {
      "condition": {
        "field": "contact.tags",
        "operator": "contains",
        "value": "premium"
      },
      "trueSteps": ["premium_path"],
      "falseSteps": ["regular_path"]
    }
  ],
  "nextStepId": null
}
```

**Operators:**
- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - String contains
- `not_contains` - String does not contain
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison

### 7. Add Tag
Add a tag to the contact.

```json
{
  "id": "add_tag_step",
  "type": "add_tag",
  "config": {
    "tag": "completed_welcome_sequence"
  },
  "nextStepId": "next_step"
}
```

### 8. Remove Tag
Remove a tag from the contact.

```json
{
  "id": "remove_tag_step",
  "type": "remove_tag",
  "config": {
    "tag": "pending_onboarding"
  },
  "nextStepId": "next_step"
}
```

---

## Triggers

### Tag Added
Trigger when a specific tag is added to a contact.

```json
{
  "type": "tag_added",
  "conditions": [
    {
      "field": "tag",
      "operator": "equals",
      "value": "new_customer"
    }
  ]
}
```

### Tag Removed
Trigger when a tag is removed.

```json
{
  "type": "tag_removed",
  "conditions": [
    {
      "field": "tag",
      "operator": "equals",
      "value": "trial"
    }
  ]
}
```

### Form Submit
Trigger when a contact submits a form.

```json
{
  "type": "form_submit",
  "conditions": [
    {
      "field": "formId",
      "operator": "equals",
      "value": "contact_form"
    }
  ]
}
```

### API Call
Trigger manually via API.

```json
{
  "type": "manual",
  "conditions": []
}
```

---

## Advanced Examples

### Example 1: Lead Nurture Sequence
```json
{
  "name": "Lead Nurture",
  "trigger": {
    "type": "tag_added",
    "conditions": [{"field": "tag", "operator": "equals", "value": "lead"}]
  },
  "steps": [
    {
      "id": "1",
      "type": "send_email",
      "config": {
        "subject": "Welcome! Here's what we offer",
        "body": "Hi {name},\n\nThanks for your interest!"
      },
      "nextStepId": "2"
    },
    {
      "id": "2",
      "type": "wait",
      "config": {"duration": 172800},
      "nextStepId": "3"
    },
    {
      "id": "3",
      "type": "send_whatsapp",
      "config": {
        "template": "Hi {name}! Have you checked out our demo?"
      },
      "nextStepId": "4"
    },
    {
      "id": "4",
      "type": "wait",
      "config": {"duration": 259200},
      "nextStepId": "5"
    },
    {
      "id": "5",
      "type": "send_sms",
      "config": {
        "message": "Last chance! Book a free consultation: {bookingLink}"
      },
      "nextStepId": "6"
    },
    {
      "id": "6",
      "type": "add_tag",
      "config": {"tag": "nurture_completed"},
      "nextStepId": null
    }
  ]
}
```

### Example 2: Abandoned Cart Recovery
```json
{
  "name": "Cart Recovery",
  "trigger": {
    "type": "tag_added",
    "conditions": [{"field": "tag", "operator": "equals", "value": "cart_abandoned"}]
  },
  "steps": [
    {
      "id": "1",
      "type": "wait",
      "config": {"duration": 3600},
      "nextStepId": "2"
    },
    {
      "id": "2",
      "type": "send_email",
      "config": {
        "subject": "You left something behind!",
        "body": "Hi {name},\n\nDon't forget your items: {cartItems}"
      },
      "nextStepId": "3"
    },
    {
      "id": "3",
      "type": "wait",
      "config": {"duration": 86400},
      "nextStepId": "4"
    },
    {
      "id": "4",
      "type": "send_whatsapp",
      "config": {
        "template": "Hi {name}! We saved your cart. Get 10% off: {discountCode}"
      },
      "nextStepId": null
    }
  ]
}
```

### Example 3: Premium vs Regular Path
```json
{
  "name": "Customer Segmentation",
  "steps": [
    {
      "id": "1",
      "type": "condition",
      "conditions": [
        {
          "condition": {
            "field": "contact.tags",
            "operator": "contains",
            "value": "premium"
          },
          "trueSteps": ["premium_1"],
          "falseSteps": ["regular_1"]
        }
      ]
    },
    {
      "id": "premium_1",
      "type": "send_email",
      "config": {
        "subject": "Exclusive Premium Benefits",
        "body": "Hi {name},\n\nAs a premium member..."
      },
      "nextStepId": null
    },
    {
      "id": "regular_1",
      "type": "send_email",
      "config": {
        "subject": "Upgrade to Premium",
        "body": "Hi {name},\n\nUpgrade today for exclusive benefits!"
      },
      "nextStepId": null
    }
  ]
}
```

---

## API Usage

### Create Workflow
```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d @workflow.json
```

### Get All Workflows
```bash
curl http://localhost:3001/api/workflows \
  -H "Cookie: session=YOUR_SESSION"
```

### Activate Workflow
```bash
curl -X POST http://localhost:3001/api/workflows/{id}/activate \
  -H "Cookie: session=YOUR_SESSION"
```

### Deactivate Workflow
```bash
curl -X POST http://localhost:3001/api/workflows/{id}/deactivate \
  -H "Cookie: session=YOUR_SESSION"
```

### Trigger Workflow Manually
```bash
curl -X POST http://localhost:3001/api/workflows/{id}/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{
    "contactId": "cnt_abc123",
    "variables": {
      "customField": "value"
    }
  }'
```

### Pause Execution
```bash
curl -X POST http://localhost:3001/api/workflows/executions/{executionId}/pause \
  -H "Cookie: session=YOUR_SESSION"
```

### Resume Execution
```bash
curl -X POST http://localhost:3001/api/workflows/executions/{executionId}/resume \
  -H "Cookie: session=YOUR_SESSION"
```

### Cancel Execution
```bash
curl -X POST http://localhost:3001/api/workflows/executions/{executionId}/cancel \
  -H "Cookie: session=YOUR_SESSION"
```

---

## Template Variables

### Contact Fields
- `{name}` - Contact name
- `{email}` - Contact email
- `{phone}` - Contact phone number
- `{telegramId}` - Telegram ID

### Tags
- `{tag}` - First tag
- `{tags}` - All tags (comma-separated)

### Custom Fields
- `{customField.fieldName}` - Any custom field

### Execution Context
- `{executionId}` - Workflow execution ID
- `{workflowName}` - Workflow name

### Date/Time
- `{currentDate}` - Current date
- `{currentTime}` - Current time

---

## Best Practices

1. **Start Simple** - Begin with 2-3 steps, then expand
2. **Test Thoroughly** - Use test contacts before going live
3. **Monitor Executions** - Check execution status regularly
4. **Use Descriptive Names** - Make workflows easy to identify
5. **Add Tags** - Use tags to track workflow progress
6. **Handle Errors** - Plan for contacts without required fields
7. **Optimize Timing** - Don't send messages at odd hours
8. **Segment Properly** - Use conditions to personalize paths
9. **Measure Results** - Track conversion rates
10. **Iterate** - Improve based on performance data

---

## Troubleshooting

### Workflow Not Triggering
- Check if workflow is `isActive: true`
- Verify trigger conditions match contact data
- Check contact has required fields (email for email step, phone for WhatsApp)

### Messages Not Sending
- Verify integration credentials are configured
- Check contact has the required field (email/phone)
- Review quota limits
- Check campaign reputation score

### Execution Stuck
- Check if waiting on a `wait` step
- Verify `nextStepId` is valid
- Check execution status: `GET /api/workflows/executions/{id}`

### Variables Not Replacing
- Ensure contact has the field (`name`, `email`, etc.)
- Check variable syntax: `{variableName}`
- Verify custom field exists in contact

---

## Performance

The workflow engine processes:
- ✅ 100+ steps per workflow
- ✅ 10,000+ concurrent executions
- ✅ 50,000+ executions per day
- ✅ Sub-second step execution
- ✅ Real-time status updates

---

## Roadmap

Coming soon:
- [ ] Visual workflow builder UI
- [ ] A/B testing
- [ ] Machine learning optimization
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Workflow templates marketplace

---

## Support

Need help? Check:
- API Documentation: `/API_DOCUMENTATION.md`
- Workflow Engine Design: `/WORKFLOW_ENGINE.md`
- Architecture: `/ARCHITECTURE.md`

---

## License
MIT
