# Becastly - Multi-Channel Marketing SaaS

A full-stack SaaS platform for sending marketing campaigns via WhatsApp (Official API), Email (SMTP/Gmail), Telegram Bot, and SMS (Twilio).

## Features

- **Contact Management**: Import/manage contacts with CSV/Excel support and duplicate detection
- **Multi-Channel Campaigns**: Send campaigns via WhatsApp, Email, Telegram, and SMS
- **Scheduling**: Schedule campaigns with daily limits and random delays
- **Analytics Dashboard**: Track message delivery, opens, and campaign performance
- **Public API**: Developer-friendly REST API with API key authentication
- **Anti-Spam**: Auto-unsubscribe handling and compliance features

## Tech Stack

### Backend
- Node.js + Fastify + TypeScript
- PostgreSQL + Prisma ORM
- BullMQ (Redis) for job queues
- Lucia Auth for session management

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- TypeScript

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository>
cd becastly
npm install
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/becastly"
REDIS_URL="redis://localhost:6379"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Meta/WhatsApp
META_WEBHOOK_TOKEN="your_webhook_verification_token"
META_APP_ID="your_meta_app_id"
META_APP_SECRET="your_meta_app_secret"
META_PHONE_NUMBER_ID="your_phone_number_id"
META_ACCESS_TOKEN="your_whatsapp_access_token"

# Twilio
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="your_twilio_phone_number"

# Telegram
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# Email/SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"

# App
APP_URL="http://localhost:3000"
API_PORT="3001"
```

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run the Application

**Start Backend & Worker:**
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Worker
npm run worker
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## API Documentation

### Authentication

**Register**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Public API (API Key Auth)

Include your API key in the Authorization header:
```http
Authorization: Bearer bk_your_api_key_here
```

**Send Single Message**
```http
POST /api/v1/messages/send
Authorization: Bearer bk_xxx
Content-Type: application/json

{
  "channel": "WHATSAPP",
  "to": "+1234567890",
  "content": "Hello from Becastly!"
}
```

## Project Structure

```
becastly/
├── src/
│   ├── modules/
│   │   ├── auth/         # Authentication
│   │   ├── contacts/     # Contact management
│   │   ├── campaigns/    # Campaign management
│   │   ├── messages/     # Message sending
│   │   ├── integrations/ # Channel integrations
│   │   └── api/          # Public API
│   ├── workers/
│   │   └── campaign.worker.ts  # BullMQ worker
│   ├── lib/
│   │   ├── prisma.ts     # Prisma client
│   │   ├── queue.ts      # BullMQ setup
│   │   ├── crypto.ts     # Encryption utilities
│   │   └── auth.ts       # Lucia auth config
│   └── app.ts            # Fastify app
├── frontend/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── lib/              # Frontend utilities
└── prisma/
    └── schema.prisma     # Database schema
```

## License

MIT
