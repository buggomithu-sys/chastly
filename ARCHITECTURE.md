# Chastly System Architecture

## Overview
Chastly is an AI-powered omnichannel sales and marketing automation platform designed for enterprise scale with support for millions of messages per day.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Web App    │  │  Mobile App  │  │  API Clients │             │
│  │  (Next.js)   │  │ (React Native)│  │  (REST API)  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
┌─────────────────────────────▼─────────────────────────────────────────┐
│                      API GATEWAY LAYER                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Nginx Reverse Proxy / Load Balancer                            │ │
│  │  - SSL/TLS Termination                                          │ │
│  │  - Rate Limiting                                                │ │
│  │  - Request Routing                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────▼─────────────────────────────────────────┐
│                     APPLICATION LAYER                                 │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────┐  ┌────────────────────┐                      │
│  │  API Server (3001) │  │  Worker Processes  │                      │
│  │  - Fastify         │  │  - BullMQ Workers  │                      │
│  │  - REST API        │  │  - Campaign Jobs   │                      │
│  │  - WebSocket       │  │  - Message Jobs    │                      │
│  │  - Auth/Session    │  │  - Workflow Jobs   │                      │
│  └────────┬───────────┘  └────────┬───────────┘                      │
│           │                        │                                  │
│  ┌────────▼────────────────────────▼───────────┐                     │
│  │  Business Logic Modules                     │                     │
│  │  ┌──────────────────────────────────────┐  │                     │
│  │  │  - Auth & Session Management         │  │                     │
│  │  │  - Campaign Management               │  │                     │
│  │  │  - Contact & Lead Management         │  │                     │
│  │  │  - Workflow Automation Engine        │  │                     │
│  │  │  - AI Conversation Engine            │  │                     │
│  │  │  - Quota & Anti-Ban Engine           │  │                     │
│  │  │  - Payment Processing                │  │                     │
│  │  │  - Analytics & Reporting             │  │                     │
│  │  │  - Team Collaboration                │  │                     │
│  │  │  - White-Label Management            │  │                     │
│  │  └──────────────────────────────────────┘  │                     │
│  └─────────────────────────────────────────────┘                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
          │                        │                        │
┌─────────▼────────┐  ┌───────────▼────────┐  ┌───────────▼───────────┐
│  DATA LAYER      │  │  QUEUE LAYER       │  │  CACHE LAYER          │
├──────────────────┤  ├────────────────────┤  ├───────────────────────┤
│                  │  │                    │  │                       │
│  PostgreSQL      │  │  Redis + BullMQ    │  │  Redis                │
│  - Users         │  │  - Campaign Queue  │  │  - Session Cache      │
│  - Contacts      │  │  - Message Queue   │  │  - Rate Limit Cache   │
│  - Campaigns     │  │  - Workflow Queue  │  │  - Analytics Cache    │
│  - Messages      │  │  - Voice Queue     │  │  - API Response Cache │
│  - Workflows     │  │  - Payment Queue   │  │                       │
│  - Analytics     │  │  - Revival Queue   │  │                       │
│                  │  │                    │  │                       │
└──────────────────┘  └────────────────────┘  └───────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                                  │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  WhatsApp   │ │   Email     │ │     SMS     │ │  Telegram   │   │
│  │  - Meta API │ │   - SMTP    │ │   - Twilio  │ │  - Bot API  │   │
│  │  - Evolution│ │   - Gmail   │ │   - MSG91   │ │             │   │
│  │             │ │   - SendGrid│ │   - Fast2SMS│ │             │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Voice Calls │ │  Payments   │ │     AI      │ │  Analytics  │   │
│  │  - Twilio   │ │  - Stripe   │ │  - OpenAI   │ │  - Mixpanel │   │
│  │  - AI Voice │ │  - Razorpay │ │  - Local LLM│ │  - GA4      │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Server (Fastify)
- **Port**: 3001
- **Framework**: Fastify (high-performance)
- **Features**:
  - RESTful API endpoints
  - WebSocket for real-time updates
  - Session-based authentication (Lucia)
  - API key authentication
  - Rate limiting (100 req/min)
  - File upload handling
  - Webhook receivers

### 2. Worker Processes (BullMQ)
- **Campaign Worker**: Processes bulk campaigns
- **Message Worker**: Sends individual messages
- **Workflow Worker**: Executes automation workflows
- **AI Worker**: Handles AI processing (intent detection, paraphrasing)
- **Voice Worker**: Manages voice calls and transcription
- **Revival Worker**: Processes lead revival campaigns
- **Payment Worker**: Handles payment processing

### 3. Database Layer (PostgreSQL)
- **Primary Database**: User data, campaigns, contacts, messages
- **Analytics Database**: Time-series data for reporting
- **Indexes**: Optimized for query performance
- **Partitioning**: Message tables partitioned by date
- **Replication**: Master-slave for read scaling

### 4. Queue System (Redis + BullMQ)
- **Job Types**:
  - Campaign jobs (bulk message creation)
  - Message jobs (individual sends)
  - Workflow jobs (step execution)
  - Voice call jobs
  - AI processing jobs
- **Features**:
  - Job prioritization
  - Retry with exponential backoff
  - Job scheduling
  - Concurrent processing
  - Dead letter queue

### 5. Cache Layer (Redis)
- Session storage
- Rate limit counters
- API response cache
- Quota tracking
- Real-time analytics aggregation

## Multi-Tenancy Architecture

### Data Isolation
- **Row-level security**: All tables have `userId` foreign key
- **Scoped queries**: All queries filtered by authenticated user
- **Encrypted data**: Sensitive credentials encrypted per-user

### White-Label Support
- Custom branding (logo, colors, domain)
- Sub-account hierarchy (reseller → clients)
- Isolated API endpoints per white-label domain

## Security Architecture

### Authentication
1. **Password Auth**: Argon2 hashing (memory-hard)
2. **Session Management**: Lucia with PostgreSQL storage
3. **API Keys**: SHA-256 hashed, permission-based
4. **Rate Limiting**: Per-IP and per-user limits

### Authorization
- Role-based access control (ADMIN, AGENT, VIEWER)
- Permission-based API endpoints
- Team member access scoping

### Data Protection
- At-rest encryption for credentials
- TLS/SSL in transit
- PII data encryption
- GDPR-compliant deletion

### Audit Trail
- All actions logged to `audit_logs`
- IP address and user agent tracking
- Entity change tracking

## Scaling Architecture

### Horizontal Scaling
```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                         (Nginx)                             │
└────────────┬────────────────────┬───────────────────────────┘
             │                    │
    ┌────────▼─────────┐  ┌──────▼──────────┐
    │  API Server 1    │  │  API Server 2   │
    └────────┬─────────┘  └──────┬──────────┘
             │                    │
    ┌────────▼────────────────────▼──────────┐
    │         PostgreSQL Master              │
    │         (Read-Write)                   │
    └────────┬───────────────────────────────┘
             │
    ┌────────▼─────────┐  ┌────────────────┐
    │   Read Replica 1 │  │ Read Replica 2 │
    └──────────────────┘  └────────────────┘
```

### Message Queue Scaling
- Multiple worker processes per job type
- Auto-scaling based on queue length
- Job distribution across workers
- Priority-based processing

### Database Scaling
- Connection pooling
- Read replicas for analytics
- Table partitioning by date
- Index optimization
- Query caching

## Performance Targets

### Throughput
- **API**: 10,000 requests/second
- **Messages**: 1,000,000 messages/day
- **Concurrent Users**: 100,000
- **Workflow Executions**: 50,000/day

### Latency
- **API Response**: < 100ms (p95)
- **Message Queue**: < 500ms (p99)
- **Dashboard Load**: < 2s
- **Campaign Start**: < 5s

### Availability
- **Uptime**: 99.9% SLA
- **Recovery Time**: < 5 minutes
- **Backup Frequency**: Every 6 hours
- **Disaster Recovery**: < 1 hour RPO

## Monitoring & Observability

### Metrics Collection
- Application metrics (Prometheus)
- Database metrics (pg_stat)
- Queue metrics (BullMQ Dashboard)
- Business metrics (custom)

### Logging
- Structured JSON logs
- Log aggregation (ELK stack)
- Error tracking (Sentry)
- Performance monitoring (APM)

### Alerting
- High error rates
- Queue backlog
- Database slow queries
- API latency spikes
- Quota exceeded
- High spam scores

## Deployment Architecture

### Docker Containerization
```yaml
services:
  - nginx (reverse proxy)
  - frontend (Next.js)
  - api (Fastify)
  - worker (BullMQ)
  - postgres (database)
  - redis (cache & queue)
```

### Orchestration (Kubernetes)
```
- Deployments: API, Worker, Frontend
- Services: Load balancing
- ConfigMaps: Environment config
- Secrets: Sensitive data
- StatefulSets: PostgreSQL, Redis
- HPA: Auto-scaling
```

### CI/CD Pipeline
1. Code push to GitHub
2. Run tests (unit, integration)
3. Build Docker images
4. Push to registry
5. Deploy to staging
6. Run E2E tests
7. Deploy to production (blue-green)

## Data Flow

### Campaign Creation
```
User → API → Database → Queue → Worker → Integration API → Message Sent
```

### Workflow Execution
```
Trigger → Workflow Engine → Execute Step → Wait/Delay → Next Step → Completion
```

### AI Conversation
```
Incoming Message → Webhook → AI Engine → Intent Detection → Response Generation → Send
```

### Lead Capture
```
Form Submit → API → AI Qualification → Lead Storage → Auto-call/Message
```

## Integration Architecture

### WhatsApp
- **Meta Cloud API**: Official Business API
- **Evolution API**: QR-based multi-device
- **Webhook**: Status updates, incoming messages
- **Media**: Support for images, videos, documents

### Email
- **SMTP**: Generic SMTP support
- **Gmail API**: OAuth-based sending
- **SendGrid**: Transactional email API
- **Unsubscribe**: One-click unsubscribe headers

### SMS
- **Twilio**: Primary SMS provider
- **MSG91**: India-specific provider
- **Fast2SMS**: Budget-friendly option
- **AWS SNS**: Enterprise option

### Voice
- **Twilio Voice**: AI-powered calling
- **Transcription**: Speech-to-text
- **IVR**: Interactive voice response
- **Call Recording**: Compliance & training

### Payments
- **Stripe**: Global payment processing
- **Razorpay**: India-specific
- **Webhook**: Payment status updates
- **Revenue Attribution**: Campaign tracking

## Anti-Ban & Anti-Spam Architecture

### Message Variation
1. **Spintax**: {Hi|Hello|Hey} {name}
2. **AI Paraphrasing**: OpenAI rewrites
3. **Random Selection**: Pick variation per message

### Reputation Tracking
- Per-channel reputation score (0-100)
- Block rate monitoring
- Spam complaint tracking
- Auto-pause on threshold breach

### Warmup Mode
- Gradual increase in sending volume
- Initial: 10 messages/day → 1000/day over 30 days
- Reputation building phase

### Fallback Channel
```
WhatsApp (failed) → Email → SMS
```

### Rate Limiting
- Daily quota per channel
- Hourly limits
- Per-minute limits
- User-configurable + admin override

## AI Architecture

### AI Services

#### 1. Lead Qualification
```
Lead Data → OpenAI → Qualification Score → Auto-tag
```

#### 2. Intent Detection
```
Message → OpenAI → Intent (pricing, objection, buy) → Route
```

#### 3. Conversation AI
```
Incoming → Context Retrieval → OpenAI → Response → Send
```

#### 4. Message Paraphrasing
```
Template → OpenAI → Variations → Random Selection
```

#### 5. Lead Scoring
```
Behavior + Interactions → ML Model → Score (0-100) → Temperature
```

### AI Models
- **Primary**: OpenAI GPT-4o-mini (cost-effective)
- **Fallback**: Local LLM (privacy-sensitive data)
- **Voice**: Twilio AI Voice + Whisper (transcription)

## Workflow Engine Architecture

### Workflow Definition
```json
{
  "id": "workflow_123",
  "trigger": {"type": "tag_added", "tag": "interested"},
  "steps": [
    {"type": "send_email", "template": "welcome", "delay": 0},
    {"type": "wait", "duration": 172800},
    {"type": "send_whatsapp", "template": "followup"},
    {"type": "condition", "field": "reply", "operator": "equals", "value": "yes",
      "true": [{"type": "send_email", "template": "pricing"}],
      "false": [{"type": "wait", "duration": 432000}, {"type": "send_sms"}]
    }
  ]
}
```

### Execution Engine
1. **Trigger Detection**: Tag added, form submit, API call
2. **Execution Creation**: Create workflow execution record
3. **Step Processing**: Execute current step
4. **State Management**: Update execution state
5. **Scheduling**: Schedule next step with delay
6. **Completion**: Mark execution as completed

### State Tracking
```json
{
  "executionId": "exec_456",
  "currentStep": 3,
  "status": "running",
  "stepData": {
    "0": {"sent": true, "messageId": "msg_1"},
    "1": {"waitUntil": "2026-02-17T12:00:00Z"},
    "2": {"sent": true, "messageId": "msg_2"},
    "3": {"condition": "evaluating"}
  }
}
```

## API Architecture

### REST API Endpoints

#### Public API (v1)
```
POST   /api/v1/send              - Send message
GET    /api/v1/status/:messageId - Check status
POST   /api/v1/contacts          - Create contact
GET    /api/v1/contacts          - List contacts
POST   /api/v1/webhooks          - Register webhook
```

#### Internal API
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/campaigns
POST   /api/campaigns
GET    /api/contacts
POST   /api/contacts/import
GET    /api/analytics
GET    /api/workflows
POST   /api/workflows
```

### Webhook System
- User-defined webhook URLs
- Retry with exponential backoff
- Event types: message.sent, message.delivered, message.failed
- Signature verification (HMAC)

## Analytics Architecture

### Data Collection
- Message events (sent, delivered, failed)
- User interactions (click, reply, unsubscribe)
- Conversion events (payment, form submit)
- Campaign performance

### Aggregation
- Real-time (Redis)
- Hourly rollups (PostgreSQL)
- Daily summaries (PostgreSQL)

### Reporting
- Delivery rates by channel
- Conversion funnels
- Revenue attribution
- Channel ROI
- User journey visualization

## Compliance & GDPR

### Data Rights
- **Right to Access**: Export all user data
- **Right to Deletion**: Delete all PII
- **Right to Portability**: JSON export
- **Right to Opt-out**: Unsubscribe handling

### Consent Management
- Opt-in tracking
- Unsubscribe links
- Consent audit log

### Data Retention
- Messages: 90 days
- Logs: 30 days
- Analytics: 2 years
- Deleted data: Purged immediately

## Disaster Recovery

### Backup Strategy
- **Database**: Daily full + hourly incremental
- **Files**: S3 versioning
- **Config**: Git-tracked

### Recovery Procedures
1. Stop all services
2. Restore database from backup
3. Verify data integrity
4. Restart services
5. Validate functionality

### High Availability
- Multi-region deployment
- Database replication
- Auto-failover
- Health checks

## Cost Optimization

### Infrastructure
- Auto-scaling workers (scale to zero)
- Connection pooling
- Query optimization
- CDN for static assets

### External Services
- Batch API calls
- Cache responses
- Use cheaper AI models for simple tasks
- Compress media files

## Future Enhancements

1. **Mobile App**: React Native iOS/Android
2. **Browser Extension**: Chrome/Firefox lead capture
3. **WordPress Plugin**: Website integration
4. **CRM Integration**: Salesforce, HubSpot
5. **Advanced AI**: Custom LLM fine-tuning
6. **Video Messages**: WhatsApp video support
7. **Voice Broadcasts**: Bulk voice calls
8. **Survey Builder**: Interactive surveys
9. **Landing Page Builder**: No-code pages
10. **A/B Testing**: Campaign optimization
