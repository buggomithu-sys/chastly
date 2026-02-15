# Chastly API Documentation

## Overview
Chastly provides a comprehensive REST API for sending multi-channel messages, managing contacts, creating workflows, and accessing analytics. The API is designed for developers building integrations, WordPress plugins, mobile apps, and third-party applications.

## Base URL
```
Production: https://api.chastly.com
Development: http://localhost:3001
```

## Authentication

### API Key Authentication
All API requests require an API key to be included in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY
```

### Generating API Keys
1. Log in to your Chastly dashboard
2. Navigate to Settings → API Keys
3. Click "Create New API Key"
4. Set permissions and copy the key (shown only once)

### Permissions
API keys can have the following permissions:
- `send:whatsapp` - Send WhatsApp messages
- `send:email` - Send emails
- `send:sms` - Send SMS messages
- `send:telegram` - Send Telegram messages
- `send:all` - Send messages on all channels
- `contacts:read` - Read contacts
- `contacts:write` - Create/update contacts
- `campaigns:read` - Read campaigns
- `campaigns:write` - Create/update campaigns
- `analytics:read` - Access analytics

## Rate Limiting
- **Default**: 100 requests per minute
- **Enterprise**: Custom limits available
- Rate limit headers included in all responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1645555200
  ```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email is required",
    "details": {
      "field": "email"
    }
  }
}
```

### HTTP Status Codes
- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or missing API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## API Endpoints

---

## Messages API

### Send Message
Send a single message via any channel.

```http
POST /api/v1/send
```

**Request Body:**
```json
{
  "channel": "whatsapp",
  "to": "+1234567890",
  "message": "Hello! This is a test message.",
  "subject": "Optional email subject",
  "metadata": {
    "campaignId": "optional_campaign_id",
    "customField": "any custom data"
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channel | string | Yes | Channel: `whatsapp`, `email`, `sms`, `telegram` |
| to | string | Yes | Recipient (phone/email/telegram ID) |
| message | string | Yes | Message content |
| subject | string | No | Email subject (required for email) |
| metadata | object | No | Custom metadata |

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "queued",
    "channel": "whatsapp",
    "to": "+1234567890",
    "queuedAt": "2026-02-15T12:00:00Z"
  }
}
```

### Get Message Status
Check the delivery status of a sent message.

```http
GET /api/v1/status/:messageId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "delivered",
    "channel": "whatsapp",
    "to": "+1234567890",
    "sentAt": "2026-02-15T12:00:05Z",
    "deliveredAt": "2026-02-15T12:00:10Z",
    "externalId": "wamid.ABC123"
  }
}
```

**Status Values:**
- `pending` - Waiting to be sent
- `queued` - In send queue
- `sent` - Sent to provider
- `delivered` - Delivered to recipient
- `failed` - Failed to send

---

## Contacts API

### Create Contact
Add a new contact to your account.

```http
POST /api/v1/contacts
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "telegramId": "@johndoe",
  "tags": ["customer", "vip"],
  "customFields": {
    "company": "Acme Inc",
    "position": "CEO"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contactId": "cnt_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "tags": ["customer", "vip"],
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

### Get Contact
Retrieve contact details.

```http
GET /api/v1/contacts/:contactId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contactId": "cnt_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "telegramId": "@johndoe",
    "tags": ["customer", "vip"],
    "status": "active",
    "leadScore": 85,
    "leadTemperature": "hot",
    "totalInteractions": 15,
    "lastActivityAt": "2026-02-14T10:30:00Z",
    "customFields": {
      "company": "Acme Inc",
      "position": "CEO"
    },
    "createdAt": "2026-01-15T12:00:00Z"
  }
}
```

### List Contacts
Get all contacts with optional filtering.

```http
GET /api/v1/contacts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 50, max: 100) |
| tags | string | Filter by tags (comma-separated) |
| status | string | Filter by status: `active`, `unsubscribed`, `bounced` |
| search | string | Search by name, email, or phone |

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "contactId": "cnt_abc123",
        "name": "John Doe",
        "email": "john@example.com",
        "tags": ["customer"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

### Update Contact
Update contact information.

```http
PATCH /api/v1/contacts/:contactId
```

**Request Body:**
```json
{
  "name": "John Smith",
  "tags": ["customer", "premium"],
  "customFields": {
    "company": "New Company"
  }
}
```

### Delete Contact
Delete a contact.

```http
DELETE /api/v1/contacts/:contactId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "contactId": "cnt_abc123"
  }
}
```

---

## Campaigns API

### Create Campaign
Create a new message campaign.

```http
POST /api/v1/campaigns
```

**Request Body:**
```json
{
  "name": "Summer Sale 2026",
  "channel": "whatsapp",
  "template": "Hi {name}! Check out our summer sale: {link}",
  "subject": "Summer Sale - 50% Off",
  "tagFilter": ["customer", "active"],
  "scheduleType": "scheduled",
  "scheduledAt": "2026-06-01T10:00:00Z",
  "dailyLimit": 1000,
  "hourlyLimit": 100,
  "minDelay": 30,
  "maxDelay": 120,
  "enableAntiSpam": true,
  "enableMessageVariation": true,
  "fallbackChannel": "email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "cmp_abc123",
    "name": "Summer Sale 2026",
    "status": "scheduled",
    "targetContacts": 5000,
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

### Start Campaign
Start a draft or paused campaign.

```http
POST /api/v1/campaigns/:campaignId/start
```

### Pause Campaign
Pause a running campaign.

```http
POST /api/v1/campaigns/:campaignId/pause
```

### Get Campaign Statistics
Get detailed statistics for a campaign.

```http
GET /api/v1/campaigns/:campaignId/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "cmp_abc123",
    "status": "running",
    "totalTargets": 5000,
    "sent": 3500,
    "delivered": 3300,
    "failed": 200,
    "replied": 150,
    "converted": 45,
    "revenue": 12500.00,
    "deliveryRate": 94.29,
    "replyRate": 4.55,
    "conversionRate": 1.36
  }
}
```

---

## Workflows API

### Create Workflow
Create an automation workflow.

```http
POST /api/v1/workflows
```

**Request Body:**
```json
{
  "name": "New Lead Nurture",
  "description": "7-day nurture sequence",
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
        "subject": "Welcome!",
        "body": "Hi {name}, welcome aboard!"
      },
      "nextStepId": "step_2"
    },
    {
      "id": "step_2",
      "type": "wait",
      "config": {
        "duration": 172800
      },
      "nextStepId": "step_3"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "wf_abc123",
    "name": "New Lead Nurture",
    "isActive": false,
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

### Activate Workflow
Activate a workflow to start processing triggers.

```http
POST /api/v1/workflows/:workflowId/activate
```

### Trigger Workflow for Contact
Manually trigger a workflow for a specific contact.

```http
POST /api/v1/workflows/:workflowId/trigger
```

**Request Body:**
```json
{
  "contactId": "cnt_abc123",
  "variables": {
    "customData": "any value"
  }
}
```

---

## Analytics API

### Get Dashboard Stats
Get overview statistics.

```http
GET /api/v1/analytics/dashboard
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | string | Start date (ISO 8601) |
| to | string | End date (ISO 8601) |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalContacts": 15000,
    "totalCampaigns": 50,
    "totalMessages": 250000,
    "deliveryRate": 94.5,
    "totalRevenue": 125000.00,
    "byChannel": {
      "whatsapp": {
        "sent": 100000,
        "delivered": 95000,
        "deliveryRate": 95.0
      },
      "email": {
        "sent": 100000,
        "delivered": 93000,
        "deliveryRate": 93.0
      },
      "sms": {
        "sent": 50000,
        "delivered": 47500,
        "deliveryRate": 95.0
      }
    }
  }
}
```

### Get Conversion Funnel
Get conversion funnel data.

```http
GET /api/v1/analytics/funnel
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "name": "Messages Sent",
        "count": 10000,
        "percentage": 100
      },
      {
        "name": "Messages Delivered",
        "count": 9500,
        "percentage": 95
      },
      {
        "name": "Messages Opened",
        "count": 4750,
        "percentage": 50
      },
      {
        "name": "Replied",
        "count": 950,
        "percentage": 10
      },
      {
        "name": "Converted",
        "count": 285,
        "percentage": 3
      }
    ]
  }
}
```

---

## Webhooks API

### Register Webhook
Register a webhook to receive events.

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/chastly",
  "events": [
    "message.sent",
    "message.delivered",
    "message.failed",
    "message.replied",
    "campaign.completed",
    "workflow.completed"
  ],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webhookId": "wh_abc123",
    "url": "https://your-app.com/webhooks/chastly",
    "events": ["message.sent", "message.delivered"],
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

### Webhook Payload
When an event occurs, Chastly sends a POST request to your webhook URL:

**Headers:**
```
X-Chastly-Signature: sha256=abc123...
X-Chastly-Event: message.delivered
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "message.delivered",
  "timestamp": "2026-02-15T12:00:00Z",
  "data": {
    "messageId": "msg_abc123",
    "contactId": "cnt_abc123",
    "channel": "whatsapp",
    "status": "delivered",
    "deliveredAt": "2026-02-15T12:00:10Z"
  }
}
```

### Verifying Webhook Signatures
Verify webhook authenticity using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

---

## Leads API

### Create Lead
Capture a new lead (typically from forms).

```http
POST /api/v1/leads
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "source": "landing_page",
  "pagesBrowsed": [
    "/pricing",
    "/features",
    "/contact"
  ],
  "timeOnSite": 180,
  "exitIntent": true,
  "customData": {
    "formId": "contact_form_1",
    "referrer": "google"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "ld_abc123",
    "qualified": true,
    "qualificationScore": 85,
    "intent": "pricing_inquiry",
    "autoCallScheduled": true,
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

---

## Payments API

### Create Payment Link
Generate a payment link for a contact.

```http
POST /api/v1/payments/links
```

**Request Body:**
```json
{
  "contactId": "cnt_abc123",
  "amount": 99.99,
  "currency": "USD",
  "description": "Premium Plan - Monthly",
  "successUrl": "https://yoursite.com/success",
  "cancelUrl": "https://yoursite.com/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_abc123",
    "paymentUrl": "https://pay.chastly.com/abc123",
    "expiresAt": "2026-02-16T12:00:00Z"
  }
}
```

---

## Team API

### Invite Team Member
Invite a team member to your account.

```http
POST /api/v1/team/members
```

**Request Body:**
```json
{
  "email": "agent@example.com",
  "name": "Support Agent",
  "role": "agent",
  "permissions": [
    "send:whatsapp",
    "contacts:read",
    "contacts:write"
  ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Invalid request parameters |
| `UNAUTHORIZED` | Invalid or missing API key |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `QUOTA_EXCEEDED` | Daily/hourly quota exceeded |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `CHANNEL_ERROR` | Channel provider error |
| `INVALID_PHONE` | Invalid phone number format |
| `INVALID_EMAIL` | Invalid email format |
| `CONTACT_UNSUBSCRIBED` | Contact has unsubscribed |
| `CAMPAIGN_PAUSED` | Campaign is paused |
| `LOW_REPUTATION` | Channel reputation too low |
| `INTERNAL_ERROR` | Server error |

---

## SDKs & Libraries

### Official SDKs
- **Node.js**: `npm install @chastly/sdk`
- **Python**: `pip install chastly`
- **PHP**: `composer require chastly/sdk`
- **WordPress Plugin**: Available in WordPress repository

### Example Usage (Node.js)
```javascript
const Chastly = require('@chastly/sdk');

const client = new Chastly('YOUR_API_KEY');

// Send a message
const message = await client.messages.send({
  channel: 'whatsapp',
  to: '+1234567890',
  message: 'Hello from Chastly!'
});

console.log('Message sent:', message.messageId);

// Create a contact
const contact = await client.contacts.create({
  name: 'John Doe',
  email: 'john@example.com',
  tags: ['customer']
});

// Start a campaign
const campaign = await client.campaigns.start('cmp_abc123');
```

---

## Pagination

All list endpoints support pagination:

**Request:**
```http
GET /api/v1/contacts?page=2&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [...],
    "pagination": {
      "page": 2,
      "limit": 50,
      "total": 500,
      "pages": 10,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

---

## Filtering & Sorting

### Filtering
Most list endpoints support filtering:
```http
GET /api/v1/contacts?tags=customer,vip&status=active
```

### Sorting
```http
GET /api/v1/campaigns?sort=createdAt&order=desc
```

---

## Best Practices

1. **Use Webhooks**: Subscribe to webhooks instead of polling for status
2. **Batch Operations**: Use bulk endpoints when creating multiple resources
3. **Handle Errors**: Implement retry logic with exponential backoff
4. **Cache Responses**: Cache frequently accessed data
5. **Rate Limiting**: Respect rate limits and implement backoff
6. **API Versioning**: Always specify API version in requests
7. **Security**: Never expose API keys in client-side code
8. **Testing**: Use test mode for development and testing

---

## Support

- **Email**: api-support@chastly.com
- **Documentation**: https://docs.chastly.com
- **Developer Portal**: https://developers.chastly.com
- **Status Page**: https://status.chastly.com
- **Community Forum**: https://community.chastly.com

---

## Changelog

### v1.0.0 (2026-02-15)
- Initial API release
- Messages, Contacts, Campaigns endpoints
- Webhook system
- Authentication with API keys
