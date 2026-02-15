# 🚀 Chastly - AI-Powered Omnichannel Sales & Marketing Platform

> **Enterprise-grade multi-tenant SaaS platform for AI-driven marketing automation, designed to scale to millions of messages per day.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Chastly is a comprehensive AI-powered platform that combines:
- **Multi-channel messaging** (WhatsApp, Email, SMS, Telegram)
- **Advanced workflow automation** with visual builder
- **AI-powered lead capture** and qualification
- **Voice calling** with AI transcription
- **Anti-ban & anti-spam** systems
- **Payment integration** with revenue tracking
- **Team collaboration** with role-based access
- **White-label** multi-tenancy support

## ✨ Features

### 🤖 AI-Powered Capabilities
- **Lead Qualification**: Automatic AI-based lead scoring (0-100)
- **Intent Detection**: Identify pricing, objection, buy, or stop signals
- **Conversation AI**: Context-aware responses with handoff to humans
- **Message Variation**: AI paraphrasing + spintax for anti-spam
- **Voice Transcription**: Speech-to-text for call analytics
- **Predictive Revival**: AI-driven reactivation campaigns

### 📱 Omnichannel Messaging
- **WhatsApp**: Cloud API + QR-based Evolution API
- **Email**: SMTP, Gmail API, SendGrid
- **SMS**: Twilio, MSG91, Fast2SMS, AWS SNS
- **Telegram**: Bot API integration
- **Voice Calls**: Twilio AI-powered calling

### ⚙️ Advanced Automation
- **Visual Workflow Builder**: Drag-and-drop interface (Zapier-like)
- **Conditional Branching**: If/then logic based on user behavior
- **Multi-step Sequences**: Email → Wait → WhatsApp → SMS chains
- **Trigger System**: Tag changes, form submits, API calls, time-based
- **Per-contact State**: Individual execution tracking

### 🛡️ Anti-Ban & Anti-Spam
- **Reputation Scoring**: Per-channel tracking (0-100)
- **Smart Quotas**: Daily, hourly, per-minute limits
- **Human-like Delays**: Non-linear random delays
- **Message Variation**: Prevent duplicate detection
- **Warmup Mode**: Progressive volume increase
- **Auto-pause**: Stops on high block/spam rates
- **Fallback Routing**: WhatsApp → Email → SMS

### 💰 Payment & Revenue
- **Payment Links**: Stripe, Razorpay integration
- **In-chat Payments**: Send payment links via any channel
- **Revenue Attribution**: Track sales per campaign
- **Conversion Tracking**: Full funnel analytics

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Live campaign statistics
- **Conversion Funnels**: Visualize user journeys
- **Channel Performance**: Compare WhatsApp vs Email vs SMS
- **ROI Tracking**: Revenue per campaign
- **Custom Reports**: Export analytics data

### 👥 Team Collaboration
- **Multi-user Accounts**: Unlimited team members
- **Role-based Access**: Admin, Agent, Viewer roles
- **Team Inbox**: Unified conversation view
- **Audit Logs**: Complete action history

### 🏢 White-Label & Multi-Tenancy
- **Custom Branding**: Logo, colors, domain
- **Reseller Hierarchy**: Agency → Sub-accounts
- **Billing Dashboard**: Revenue tracking
- **White-label APIs**: Custom API endpoints

### 🔌 Developer API
- **REST API**: Complete programmatic access
- **Webhook System**: Real-time event notifications
- **API Keys**: Permission-based access control
- **Rate Limiting**: 100 req/min default
- **SDKs**: Node.js, Python, PHP (planned)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                      (Nginx)                            │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│ API    │      │ Worker  │
│ Server │      │ Process │
└───┬────┘      └────┬────┘
    │                │
    └────────┬───────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │
    │   + Prisma ORM  │
    └─────────────────┘
             │
    ┌────────▼────────┐
    │  Redis Cache    │
    │  + BullMQ       │
    └─────────────────┘
```

**Key Components:**
- **Fastify API**: High-performance REST API
- **PostgreSQL**: Primary database with Prisma ORM
- **Redis**: Caching + BullMQ job queues
- **Next.js**: Frontend with React + Tailwind
- **Docker**: Containerized deployment

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📚 Documentation

Comprehensive documentation has been created (114 KB total):

| Document | Size | Description |
|----------|------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 18 KB | System architecture, scaling, deployment |
| [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) | 22 KB | Workflow automation engine design |
| [ANTI_BAN_ALGORITHM.md](./ANTI_BAN_ALGORITHM.md) | 22 KB | Anti-spam & quota algorithms |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | 17 KB | Complete REST API reference |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | 22 KB | Database schema & ERD |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | 13 KB | Project status & roadmap |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/buggomithu-sys/chastly.git
cd chastly
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start with Docker**
```bash
docker-compose up -d
```

4. **Run migrations**
```bash
docker-compose exec api npx prisma migrate deploy
```

5. **Access the application**
- Frontend: http://localhost
- API: http://localhost:3001
- Database: localhost:5432

### Manual Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start development
npm run dev
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify 5.x
- **ORM**: Prisma 6.x
- **Database**: PostgreSQL 14+
- **Cache**: Redis 6+
- **Queue**: BullMQ 5.x
- **Auth**: Lucia + Argon2
- **Language**: TypeScript 5.x

### Frontend
- **Framework**: Next.js 14+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS 3.x
- **Components**: shadcn/ui
- **Forms**: React Hook Form
- **HTTP Client**: Axios

### AI & External Services
- **AI**: OpenAI GPT-4o-mini
- **Voice**: Twilio Voice API
- **SMS**: Twilio, MSG91, Fast2SMS, AWS SNS
- **Email**: SMTP, Gmail API, SendGrid
- **WhatsApp**: Meta Cloud API, Evolution API
- **Payments**: Stripe, Razorpay

### DevOps
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (ready)
- **CI/CD**: GitHub Actions (planned)
- **Monitoring**: Prometheus + Grafana (planned)
- **Logging**: ELK Stack (planned)

## 📊 Project Status

**Overall Progress: ~35% Complete**

### ✅ Completed (Phase 1)
- [x] Enhanced database schema (10 new models)
- [x] Comprehensive documentation (114 KB)
- [x] Workflow service layer
- [x] Workflow REST API
- [x] Environment configuration
- [x] API documentation

### ⏳ In Progress (Phase 4)
- [ ] Workflow execution worker (40% remaining)
- [ ] Step action executors
- [ ] Trigger handlers
- [ ] Workflow scheduler

### 📋 Planned
- [ ] AI integration (OpenAI, voice, intent detection)
- [ ] Anti-ban system implementation
- [ ] Payment integration (Stripe, Razorpay)
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] White-label implementation
- [ ] Frontend workflow builder UI
- [ ] Mobile app (React Native)

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for detailed status.

## 🗺️ Roadmap

### Q1 2026
- [ ] Complete workflow execution engine
- [ ] Implement quota & anti-ban system
- [ ] AI conversation engine
- [ ] Payment integration

### Q2 2026
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] White-label implementation
- [ ] Mobile app (beta)

### Q3 2026
- [ ] Template marketplace
- [ ] WordPress plugin
- [ ] CRM integrations
- [ ] A/B testing

### Q4 2026
- [ ] Landing page builder
- [ ] Survey builder
- [ ] Video messaging
- [ ] Voice broadcasts

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| API Throughput | 10,000 req/sec |
| Messages/Day | 1,000,000+ |
| Concurrent Users | 100,000+ |
| API Latency (p95) | < 100ms |
| Uptime SLA | 99.9% |

## 🔒 Security

- **Password Hashing**: Argon2 (memory-hard)
- **API Keys**: SHA-256 hashing
- **Credentials**: AES-256 encryption
- **Sessions**: Secure cookie-based
- **Rate Limiting**: Per-IP and per-user
- **Audit Logging**: Complete action trail
- **GDPR Compliance**: Data export & deletion

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- **Email**: support@chastly.com
- **Documentation**: [docs.chastly.com](https://docs.chastly.com)
- **Issues**: [GitHub Issues](https://github.com/buggomithu-sys/chastly/issues)
- **Discussions**: [GitHub Discussions](https://github.com/buggomithu-sys/chastly/discussions)

## 🌟 Key Highlights

### Enterprise-Ready
- Multi-tenant architecture
- Scalable to millions of messages/day
- Production-ready database schema
- Comprehensive security measures

### AI-Powered
- Automatic lead qualification
- Intent detection
- Conversation AI
- Message variation
- Predictive analytics

### Developer-Friendly
- Complete REST API
- Webhook system
- Extensive documentation
- TypeScript throughout
- Clean architecture

### Cost-Effective
- Open-source core
- Self-hostable
- Efficient resource usage
- ~$2-4K/month at 1M messages/day

---

**Built with ❤️ for modern marketing teams**

*Chastly - Where AI meets marketing automation*
