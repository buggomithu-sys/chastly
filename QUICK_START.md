# 🚀 Quick Start Guide - Chastly Platform

## For Developers: Getting Started

### 1. Review Documentation (5 min)
Start here to understand the platform:
```
📖 PROJECT_README.md      - Project overview & features
📖 FINAL_SUMMARY.md       - What's been implemented
📖 ARCHITECTURE.md        - System architecture
```

### 2. Understand Database Schema (10 min)
```
📖 DATABASE_SCHEMA.md     - Complete schema documentation
📁 prisma/schema.prisma   - Database models
```

Key models to understand:
- **User**: Multi-tenant accounts with white-label support
- **Contact**: Leads with AI scoring and temperature
- **Campaign**: Multi-channel campaigns with anti-spam
- **Workflow**: Automation engine
- **WorkflowExecution**: Per-contact workflow state

### 3. Explore API Endpoints (10 min)
```
📖 API_DOCUMENTATION.md   - Complete API reference
📁 src/modules/workflows/ - Workflow API implementation
```

### 4. Setup Development Environment (15 min)

#### Option A: Docker (Recommended)
```bash
# 1. Clone repository
git clone https://github.com/buggomithu-sys/chastly.git
cd chastly

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start services
docker-compose up -d

# 4. Run migrations
docker-compose exec api npx prisma migrate deploy

# 5. Access application
# Frontend: http://localhost
# API: http://localhost:3001
```

#### Option B: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Setup database
# Create PostgreSQL database
# Update DATABASE_URL in .env

# 3. Run migrations
npx prisma migrate deploy
npx prisma generate

# 4. Start development
npm run dev
```

### 5. Test API (5 min)
```bash
# Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'

# Create a workflow (after login)
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "name": "Welcome Sequence",
    "description": "New customer welcome",
    "isActive": false,
    "trigger": {
      "type": "tag_added",
      "conditions": [{"field": "tag", "operator": "equals", "value": "new_customer"}]
    },
    "steps": [
      {
        "id": "step_1",
        "type": "send_email",
        "config": {"subject": "Welcome!", "body": "Hi {name}!"},
        "nextStepId": "step_2"
      },
      {
        "id": "step_2",
        "type": "wait",
        "config": {"duration": 86400},
        "nextStepId": null
      }
    ]
  }'
```

---

## For Product Managers: Understanding Features

### ✅ What's Working Now
1. **Multi-channel messaging**: WhatsApp, Email, SMS, Telegram
2. **Contact management**: Import, tag, segment
3. **Campaign management**: Create, schedule, track
4. **Workflow API**: CRUD operations, execution control
5. **Authentication**: Session + API keys

### 🗄️ What's Ready in Database
1. **AI lead capture** with behavior tracking
2. **Voice calling** with transcription
3. **Quota tracking** for anti-spam
4. **Reputation scoring** per channel
5. **Payment transactions** for revenue tracking
6. **Team collaboration** with roles
7. **Audit logs** for compliance

### 📋 What Needs Implementation
1. **Workflow execution worker** (BullMQ)
2. **AI integrations** (OpenAI)
3. **Payment integrations** (Stripe, Razorpay)
4. **Anti-ban system** implementation
5. **Analytics dashboard** UI
6. **Frontend workflow builder**

---

## For Business: Understanding Value

### Current Capabilities
- ✅ Send messages to 1000s of contacts
- ✅ Schedule campaigns across channels
- ✅ Track delivery and engagement
- ✅ Manage contacts with tags
- ✅ API access for integrations

### Coming Soon (12-18 weeks)
- 🚀 AI-powered lead qualification
- 🚀 Automated workflow sequences
- 🚀 Anti-spam protection
- 🚀 Payment collection
- 🚀 Advanced analytics
- 🚀 Team collaboration
- 🚀 White-label branding

### Business Impact
- **Scalability**: Handle 1M+ messages/day
- **Cost**: $0.002-0.004 per message
- **ROI**: AI-powered conversion optimization
- **Compliance**: GDPR-ready architecture
- **Revenue**: White-label and marketplace potential

---

## Key Files Reference

### Documentation (Read in order)
1. `PROJECT_README.md` - Start here
2. `FINAL_SUMMARY.md` - What's been built
3. `ARCHITECTURE.md` - How it works
4. `WORKFLOW_ENGINE.md` - Automation design
5. `ANTI_BAN_ALGORITHM.md` - Anti-spam design
6. `API_DOCUMENTATION.md` - API reference
7. `DATABASE_SCHEMA.md` - Database details
8. `IMPLEMENTATION_SUMMARY.md` - Project status

### Code
- `prisma/schema.prisma` - Database models
- `src/modules/workflows/workflows.service.ts` - Workflow logic
- `src/modules/workflows/workflows.routes.ts` - Workflow API
- `src/modules/campaigns/` - Campaign management
- `src/modules/contacts/` - Contact management
- `src/modules/messages/` - Message handling

### Configuration
- `.env.example` - Environment variables template
- `docker-compose.yml` - Docker setup
- `package.json` - Dependencies

---

## Common Tasks

### Create a Campaign
```typescript
POST /api/campaigns
{
  "name": "Summer Sale",
  "channel": "whatsapp",
  "template": "Hi {name}! Summer sale is here!",
  "tagFilter": ["customer"],
  "dailyLimit": 1000
}
```

### Create a Workflow
```typescript
POST /api/workflows
{
  "name": "Lead Nurture",
  "trigger": {
    "type": "tag_added",
    "conditions": [{"field": "tag", "operator": "equals", "value": "lead"}]
  },
  "steps": [
    {"id": "1", "type": "send_email", "config": {...}},
    {"id": "2", "type": "wait", "config": {"duration": 86400}},
    {"id": "3", "type": "send_whatsapp", "config": {...}}
  ]
}
```

### Send a Message
```typescript
POST /api/v1/send
{
  "channel": "whatsapp",
  "to": "+1234567890",
  "message": "Hello!"
}
```

### Import Contacts
```bash
# Upload CSV file
POST /api/contacts/import
Content-Type: multipart/form-data
file: contacts.csv
```

---

## Database Migration

### Apply New Schema
```bash
# 1. Backup existing database
pg_dump -U becastly becastly > backup_$(date +%Y%m%d).sql

# 2. Generate migration
npx prisma migrate dev --name add_advanced_features

# 3. Apply migration
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. Restart application
docker-compose restart api worker
```

---

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
docker-compose logs postgres

# Verify connection
docker-compose exec api npx prisma db pull
```

### API Not Responding
```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Queue Not Processing
```bash
# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

### Migration Fails
```bash
# Reset database (CAUTION: destroys data)
npx prisma migrate reset

# Or manually fix and retry
npx prisma migrate resolve --applied MIGRATION_NAME
npx prisma migrate deploy
```

---

## Performance Monitoring

### Key Metrics to Watch
1. **API Latency**: Should be < 100ms (p95)
2. **Queue Depth**: Should stay below 1000
3. **Database Connections**: Should not max out pool
4. **Redis Memory**: Monitor usage
5. **Message Delivery Rate**: Should be > 95%

### Monitoring Queries
```sql
-- Slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('becastly'));

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;
```

---

## Security Checklist

Before going to production:

- [ ] Change default passwords
- [ ] Generate secure ENCRYPTION_KEY
- [ ] Enable SSL/TLS
- [ ] Configure firewall
- [ ] Set up backup automation
- [ ] Enable audit logging
- [ ] Review API key permissions
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Test disaster recovery
- [ ] Security audit
- [ ] Penetration testing

---

## Next Steps

### For Immediate Use
1. Set up development environment
2. Run database migrations
3. Test existing API endpoints
4. Review documentation

### For Full Implementation
1. Complete workflow execution engine (1-2 weeks)
2. Implement anti-ban system (1-2 weeks)
3. Integrate AI services (2-3 weeks)
4. Add payment integrations (1 week)
5. Build analytics dashboard (2-3 weeks)
6. Create frontend UI (3-4 weeks)
7. Test and QA (2-3 weeks)

---

## Support

- **Documentation**: See files in repository
- **Issues**: GitHub Issues
- **Architecture Questions**: See ARCHITECTURE.md
- **API Questions**: See API_DOCUMENTATION.md
- **Database Questions**: See DATABASE_SCHEMA.md

---

**🚀 Ready to build the future of marketing automation!**
