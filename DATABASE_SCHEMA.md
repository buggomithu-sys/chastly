# Database Schema Documentation

## Overview
Chastly uses PostgreSQL as the primary database with Prisma ORM. The schema is designed for multi-tenancy, scalability, and GDPR compliance.

## Entity Relationship Diagram

```
┌─────────────┐
│    User     │──────┬──────────────────────────────────┐
└─────────────┘      │                                  │
       │             │                                  │
       │ 1:N         │                                  │
       │             │                                  │
┌──────▼──────┐     │                                  │
│  Session    │     │                                  │
└─────────────┘     │                                  │
       │             │                                  │
┌──────▼──────┐     │                                  │
│  Contact    │◄────┘                                  │
└─────────────┘                                         │
       │ 1:N                                            │
       │                                                │
┌──────▼──────┐      ┌──────────────┐                 │
│   Message   │──────│   Campaign   │◄────────────────┘
└─────────────┘      └──────────────┘
       │                     │
       │                     │
┌──────▼──────┐      ┌──────▼──────┐
│Conversation │      │   Workflow  │
│  History    │      │  Execution  │
└─────────────┘      └─────────────┘
```

## Core Tables

### User
Represents a user account (individual or organization).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Unique user identifier |
| email | String | UNIQUE, NOT NULL | User email address |
| passwordHash | String | NOT NULL | Argon2 hashed password |
| name | String | NULLABLE | User's full name |
| plan | Enum | DEFAULT FREE | Subscription plan |
| dailyQuota | Integer | DEFAULT 100 | Daily message quota |
| isWhiteLabel | Boolean | DEFAULT false | White-label account flag |
| brandingConfig | String (JSON) | NULLABLE | White-label settings |
| parentUserId | String (CUID) | NULLABLE, FK | Parent user for reseller hierarchy |
| createdAt | DateTime | DEFAULT now() | Account creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Indexes:**
- `email` (unique)
- `parentUserId`

**Relationships:**
- Has many: `Session`, `Contact`, `Campaign`, `ApiKey`, `Integration`, `Lead`, `Workflow`, `TeamMember`
- Self-referential: `parentUser` → `subAccounts` (reseller hierarchy)

---

### Session
User authentication sessions (managed by Lucia).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Session identifier |
| userId | String (CUID) | FK, NOT NULL | User who owns this session |
| expiresAt | DateTime | NOT NULL | Session expiration time |

**Indexes:**
- `userId`

**Relationships:**
- Belongs to: `User`

---

### Contact
Represents a contact/lead in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Contact identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| name | String | NULLABLE | Contact name |
| phone | String | NULLABLE | Phone (E.164 format) |
| email | String | NULLABLE | Email address |
| telegramId | String | NULLABLE | Telegram username/ID |
| tags | String[] | DEFAULT [] | Contact tags |
| status | Enum | DEFAULT ACTIVE | Contact status |
| leadScore | Integer | DEFAULT 0 | AI lead score (0-100) |
| leadTemperature | Enum | DEFAULT COLD | Lead classification |
| lastActivityAt | DateTime | NULLABLE | Last interaction timestamp |
| totalInteractions | Integer | DEFAULT 0 | Total interaction count |
| conversionValue | Float | DEFAULT 0 | Total revenue from contact |
| customFields | String (JSON) | NULLABLE | Custom data |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Update timestamp |

**Indexes:**
- `userId`
- `leadScore`
- `leadTemperature`
- Composite: `(userId, email)` for faster lookups

**Relationships:**
- Belongs to: `User`
- Has many: `Message`, `ConversationHistory`, `WorkflowExecution`

**Status Values:**
- `ACTIVE` - Can receive messages
- `UNSUBSCRIBED` - Opted out
- `BOUNCED` - Invalid/bounced contact

**Lead Temperature:**
- `HOT` - High engagement, ready to buy
- `WARM` - Some engagement
- `COLD` - Low/no engagement

---

### Campaign
Represents a bulk messaging campaign.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Campaign identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| name | String | NOT NULL | Campaign name |
| channel | Enum | NOT NULL | Message channel |
| status | Enum | DEFAULT DRAFT | Campaign status |
| template | String | NOT NULL | Message template |
| subject | String | NULLABLE | Email subject |
| tagFilter | String[] | DEFAULT [] | Target tags |
| scheduleType | Enum | DEFAULT IMMEDIATE | Schedule type |
| scheduledAt | DateTime | NULLABLE | Schedule timestamp |
| dailyLimit | Integer | DEFAULT 50 | Daily send limit |
| hourlyLimit | Integer | NULLABLE | Hourly send limit |
| perMinuteLimit | Integer | NULLABLE | Per-minute limit |
| minDelay | Integer | DEFAULT 30 | Min delay (seconds) |
| maxDelay | Integer | DEFAULT 120 | Max delay (seconds) |
| sentCount | Integer | DEFAULT 0 | Messages sent |
| deliveredCount | Integer | DEFAULT 0 | Messages delivered |
| failedCount | Integer | DEFAULT 0 | Messages failed |
| replyCount | Integer | DEFAULT 0 | Replies received |
| conversionCount | Integer | DEFAULT 0 | Conversions |
| revenue | Float | DEFAULT 0 | Revenue generated |
| enableAntiSpam | Boolean | DEFAULT true | Anti-spam enabled |
| enableMessageVariation | Boolean | DEFAULT false | Message variation |
| fallbackChannel | Enum | NULLABLE | Fallback channel |
| warmupMode | Boolean | DEFAULT false | Warmup mode |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Update timestamp |

**Indexes:**
- `userId`
- `status`
- `scheduledAt`

**Relationships:**
- Belongs to: `User`
- Has many: `Message`

**Status Values:**
- `DRAFT` - Not yet started
- `SCHEDULED` - Scheduled for future
- `RUNNING` - Currently sending
- `PAUSED` - Temporarily paused
- `COMPLETED` - Finished sending

**Channel Values:**
- `WHATSAPP`
- `EMAIL`
- `SMS`
- `TELEGRAM`

---

### Message
Individual message record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Message identifier |
| campaignId | String (CUID) | FK, NOT NULL | Parent campaign |
| contactId | String (CUID) | FK, NOT NULL | Recipient contact |
| channel | Enum | NOT NULL | Message channel |
| content | String | NOT NULL | Message content |
| status | Enum | DEFAULT PENDING | Delivery status |
| externalId | String | NULLABLE | Provider message ID |
| sentAt | DateTime | NULLABLE | Send timestamp |
| deliveredAt | DateTime | NULLABLE | Delivery timestamp |
| failedAt | DateTime | NULLABLE | Failure timestamp |
| errorMessage | String | NULLABLE | Error details |
| replyReceived | Boolean | DEFAULT false | Reply flag |
| retryCount | Integer | DEFAULT 0 | Retry attempts |

**Indexes:**
- `campaignId`
- `contactId`
- `status`
- Composite: `(campaignId, status)` for campaign stats

**Relationships:**
- Belongs to: `Campaign`, `Contact`

**Status Values:**
- `PENDING` - Not yet queued
- `QUEUED` - In send queue
- `SENT` - Sent to provider
- `DELIVERED` - Delivered to recipient
- `FAILED` - Failed to send

**Partitioning Strategy:**
Partition by `sentAt` date for better performance:
```sql
PARTITION BY RANGE (sentAt);
-- messages_2026_02, messages_2026_03, etc.
```

---

### Integration
Channel integration credentials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Integration identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| channel | Enum | NOT NULL | Channel type |
| provider | String | NOT NULL | Provider name |
| config | String | NOT NULL | Encrypted JSON config |
| isActive | Boolean | DEFAULT true | Active flag |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- Unique: `(userId, channel, provider)`

**Relationships:**
- Belongs to: `User`

**Provider Values:**
- `whatsapp_cloud` - Meta Cloud API
- `evolution` - Evolution QR API
- `twilio` - Twilio SMS/Voice
- `telegram_bot` - Telegram Bot API
- `smtp` - SMTP email
- `gmail_api` - Gmail API
- `sendgrid` - SendGrid API

**Encryption:**
The `config` field stores encrypted JSON containing credentials:
```json
{
  "apiKey": "encrypted_value",
  "phoneNumberId": "encrypted_value",
  "webhookToken": "encrypted_value"
}
```

---

### ApiKey
API keys for programmatic access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | API key identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| name | String | NOT NULL | Key name/description |
| keyHash | String | NOT NULL | SHA-256 hash of key |
| permissions | String[] | NOT NULL | Permission list |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- `userId`
- `keyHash` (for authentication)

**Relationships:**
- Belongs to: `User`

**Permissions:**
- `send:whatsapp`
- `send:email`
- `send:sms`
- `send:telegram`
- `send:all`
- `contacts:read`
- `contacts:write`
- `campaigns:read`
- `campaigns:write`
- `analytics:read`

---

## Advanced Features Tables

### Lead
Captured leads before conversion to contacts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Lead identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| name | String | NULLABLE | Lead name |
| email | String | NULLABLE | Email address |
| phone | String | NULLABLE | Phone number |
| source | String | NULLABLE | Lead source |
| intent | String | NULLABLE | AI-detected intent |
| pagesBrowsed | String[] | DEFAULT [] | Visited pages |
| timeOnSite | Integer | DEFAULT 0 | Time on site (seconds) |
| exitIntent | Boolean | DEFAULT false | Exit intent detected |
| qualified | Boolean | DEFAULT false | AI qualified |
| qualificationData | String (JSON) | NULLABLE | AI qualification |
| convertedToContact | Boolean | DEFAULT false | Conversion flag |
| contactId | String | NULLABLE | Resulting contact ID |
| customData | String (JSON) | NULLABLE | Custom data |
| createdAt | DateTime | DEFAULT now() | Capture timestamp |

**Indexes:**
- `userId`
- `qualified`
- `createdAt`

**Relationships:**
- Belongs to: `User`

---

### Workflow
Automation workflow definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Workflow identifier |
| userId | String (CUID) | FK, NOT NULL | Owner user |
| name | String | NOT NULL | Workflow name |
| description | String | NULLABLE | Description |
| isActive | Boolean | DEFAULT false | Active flag |
| trigger | String (JSON) | NOT NULL | Trigger config |
| steps | String (JSON) | NOT NULL | Step definitions |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Update timestamp |

**Indexes:**
- `userId`
- `isActive`

**Relationships:**
- Belongs to: `User`
- Has many: `WorkflowExecution`

---

### WorkflowExecution
Workflow execution state per contact.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Execution identifier |
| workflowId | String (CUID) | FK, NOT NULL | Workflow |
| contactId | String (CUID) | FK, NOT NULL | Contact |
| currentStep | Integer | DEFAULT 0 | Current step index |
| status | String | NOT NULL | Execution status |
| stepData | String (JSON) | NULLABLE | Step execution data |
| startedAt | DateTime | DEFAULT now() | Start timestamp |
| completedAt | DateTime | NULLABLE | Completion timestamp |
| nextStepAt | DateTime | NULLABLE | Next step schedule |

**Indexes:**
- `workflowId`
- `contactId`
- `nextStepAt` (for scheduler)
- `status`

**Relationships:**
- Belongs to: `Workflow`, `Contact`

**Status Values:**
- `running` - Currently executing
- `waiting` - Waiting for delay
- `paused` - Manually paused
- `completed` - Finished
- `failed` - Error occurred
- `cancelled` - Manually cancelled

---

### ConversationHistory
Tracks all conversations per contact.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Record identifier |
| contactId | String (CUID) | FK, NOT NULL | Contact |
| channel | Enum | NOT NULL | Message channel |
| direction | String | NOT NULL | inbound/outbound |
| message | String | NOT NULL | Message content |
| intent | String | NULLABLE | AI-detected intent |
| sentiment | String | NULLABLE | AI sentiment |
| handoffToHuman | Boolean | DEFAULT false | Human handoff flag |
| agentId | String | NULLABLE | Team member ID |
| createdAt | DateTime | DEFAULT now() | Message timestamp |

**Indexes:**
- `contactId`
- `createdAt`

**Relationships:**
- Belongs to: `Contact`

**Intent Values:**
- `pricing` - Pricing inquiry
- `objection` - Objection/concern
- `buy` - Ready to purchase
- `stop` - Wants to stop
- `support` - Support request

**Sentiment Values:**
- `positive`
- `neutral`
- `negative`

---

### QuotaTracking
Tracks quota usage per user/channel/hour.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Record identifier |
| userId | String (CUID) | FK, NOT NULL | User |
| channel | Enum | NOT NULL | Channel |
| date | Date | NOT NULL | Calendar date |
| hourSlot | Integer | NOT NULL | Hour (0-23) |
| count | Integer | DEFAULT 0 | Message count |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- Unique: `(userId, channel, date, hourSlot)`
- Composite: `(userId, channel, date)` for daily queries

**Relationships:**
- Belongs to: `User`

---

### ChannelReputation
Tracks sender reputation per channel.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Record identifier |
| userId | String (CUID) | FK, NOT NULL | User |
| channel | Enum | NOT NULL | Channel |
| identifier | String | NOT NULL | Phone/domain/sender ID |
| totalSent | Integer | DEFAULT 0 | Total sent |
| totalDelivered | Integer | DEFAULT 0 | Total delivered |
| totalFailed | Integer | DEFAULT 0 | Total failed |
| totalBlocked | Integer | DEFAULT 0 | Total blocked |
| spamComplaints | Integer | DEFAULT 0 | Spam complaints |
| bounceRate | Float | DEFAULT 0 | Bounce rate |
| reputationScore | Integer | DEFAULT 100 | Score (0-100) |
| warmupPhase | Boolean | DEFAULT true | Warmup flag |
| lastSentAt | DateTime | NULLABLE | Last send timestamp |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Update timestamp |

**Indexes:**
- Unique: `(userId, channel, identifier)`
- Composite: `(userId, channel)`

**Relationships:**
- Belongs to: `User`

---

### PaymentTransaction
Payment records for revenue tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Transaction identifier |
| userId | String (CUID) | FK, NOT NULL | User |
| contactId | String | NULLABLE | Contact (if applicable) |
| campaignId | String | NULLABLE | Campaign (attribution) |
| amount | Float | NOT NULL | Amount |
| currency | String | DEFAULT USD | Currency code |
| status | String | NOT NULL | Transaction status |
| provider | String | NOT NULL | Payment provider |
| externalId | String | NULLABLE | Provider transaction ID |
| metadata | String (JSON) | NULLABLE | Additional data |
| createdAt | DateTime | DEFAULT now() | Transaction timestamp |

**Indexes:**
- `userId`
- `status`
- `createdAt`

**Relationships:**
- Belongs to: `User`

**Status Values:**
- `pending` - Awaiting payment
- `completed` - Payment successful
- `failed` - Payment failed
- `refunded` - Refunded

---

### TeamMember
Team members for collaboration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Member identifier |
| userId | String (CUID) | FK, NOT NULL | Organization owner |
| email | String | NOT NULL | Member email |
| name | String | NULLABLE | Member name |
| role | Enum | DEFAULT AGENT | Team role |
| permissions | String[] | NOT NULL | Specific permissions |
| isActive | Boolean | DEFAULT true | Active flag |
| createdAt | DateTime | DEFAULT now() | Invite timestamp |

**Indexes:**
- Unique: `(userId, email)`
- `userId`

**Relationships:**
- Belongs to: `User` (organization)

**Roles:**
- `ADMIN` - Full access
- `AGENT` - Send messages, manage contacts
- `VIEWER` - Read-only access

---

### Template
Marketplace templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Template identifier |
| userId | String (CUID) | FK, NULLABLE | Creator (null = system) |
| name | String | NOT NULL | Template name |
| description | String | NULLABLE | Description |
| category | String | NOT NULL | Category |
| channel | Enum | NULLABLE | Channel (if specific) |
| content | String | NOT NULL | Template content/workflow |
| price | Float | NULLABLE | Price (if paid) |
| downloads | Integer | DEFAULT 0 | Download count |
| rating | Float | NULLABLE | Average rating |
| isPublic | Boolean | DEFAULT false | Public marketplace |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- `userId`
- `isPublic`
- `category`

**Relationships:**
- Belongs to: `User` (optional)

---

### VoiceCall
AI voice call records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Call identifier |
| contactId | String | NULLABLE | Contact (if known) |
| phone | String | NOT NULL | Phone number |
| status | String | NOT NULL | Call status |
| duration | Integer | NULLABLE | Duration (seconds) |
| transcript | String | NULLABLE | Voice transcript |
| qualificationScore | Integer | NULLABLE | Qualification (0-100) |
| handoffToWhatsApp | Boolean | DEFAULT false | WhatsApp handoff flag |
| recordingUrl | String | NULLABLE | Recording URL |
| externalId | String | NULLABLE | Twilio Call SID |
| createdAt | DateTime | DEFAULT now() | Call timestamp |
| completedAt | DateTime | NULLABLE | Completion timestamp |

**Indexes:**
- `contactId`
- `status`
- `createdAt`

**Status Values:**
- `queued` - Waiting to dial
- `ringing` - Calling
- `in-progress` - Call in progress
- `completed` - Call completed
- `failed` - Call failed
- `no-answer` - No answer
- `busy` - Line busy

---

### AuditLog
Audit trail for compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (CUID) | PK | Log identifier |
| userId | String | NOT NULL | User who performed action |
| action | String | NOT NULL | Action type |
| entityType | String | NULLABLE | Entity type |
| entityId | String | NULLABLE | Entity ID |
| metadata | String (JSON) | NULLABLE | Additional data |
| ipAddress | String | NULLABLE | IP address |
| userAgent | String | NULLABLE | User agent |
| createdAt | DateTime | DEFAULT now() | Action timestamp |

**Indexes:**
- `userId`
- `createdAt`
- `action`

**Action Types:**
- `create_campaign`
- `delete_contact`
- `send_message`
- `update_integration`
- `export_data`
- `delete_account`

---

## Database Optimizations

### Indexes
- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes for filtered queries

### Partitioning
- `Message` table partitioned by `sentAt` date
- `AuditLog` partitioned by `createdAt` month
- `QuotaTracking` partitioned by `date`

### Archival Strategy
- Archive messages older than 90 days
- Archive audit logs older than 1 year
- Archive completed workflows after 30 days

### Query Optimization
- Use connection pooling (Prisma default)
- Read replicas for analytics queries
- Materialized views for dashboard stats

---

## Data Migration Strategy

### Adding New Columns
```sql
-- Add column with default value
ALTER TABLE contacts ADD COLUMN lead_temperature VARCHAR DEFAULT 'COLD';

-- Create index
CREATE INDEX idx_contacts_temperature ON contacts(lead_temperature);
```

### Schema Version Control
- Use Prisma migrations
- Version migrations: `20260215_add_lead_features`
- Always test on staging first

---

## GDPR Compliance

### Data Deletion
When user requests deletion:
1. Anonymize contact data (remove PII)
2. Delete conversation history
3. Keep aggregated analytics (anonymized)
4. Mark user as deleted (soft delete for 30 days)

### Data Export
Provide JSON export of all user data:
- Contacts
- Messages
- Campaigns
- Workflows
- Analytics

---

## Backup Strategy

### Automated Backups
- **Frequency**: Every 6 hours
- **Retention**: 30 days
- **Type**: Full + incremental
- **Storage**: S3-compatible storage

### Point-in-Time Recovery
- PostgreSQL WAL archiving
- Restore to any point within 7 days

---

## Monitoring

### Key Metrics
- Table sizes
- Query performance (slow queries > 1s)
- Connection pool usage
- Replication lag
- Disk usage

### Alerts
- Disk usage > 80%
- Slow queries detected
- Replication lag > 10s
- Connection pool exhausted

---

## Security

### Encryption
- At-rest encryption (PostgreSQL TDE)
- In-transit encryption (TLS/SSL)
- Application-level encryption for credentials

### Access Control
- Least privilege principle
- Separate read/write users
- No direct database access (use API)

---

## Future Schema Changes

### Planned Additions
1. `EmailTemplate` - Rich email templates
2. `Survey` - Interactive surveys
3. `LandingPage` - Landing page builder
4. `ABTest` - A/B testing campaigns
5. `Subscription` - Recurring payments
