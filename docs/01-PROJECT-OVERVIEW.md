```markdown
# Webhook Testing Platform - Project Overview (SQLite + Prisma)

## Project Vision
Build a modern, developer-focused webhook testing platform that goes beyond basic request capturing to provide intelligent debugging, automation, and collaboration features.

## Target Audience
- Individual developers testing webhooks during development
- QA/testing teams validating webhook integrations
- API platform providers needing webhook testing infrastructure
- DevOps teams integrating webhook testing into CI/CD pipelines

## Core Value Propositions
1. **Advanced Debugging**: AI-powered analysis and visual inspection tools using gemini 2.5 flash model
2. **Developer Productivity**: CLI tools, integrations, and workflow optimization
3. **Automation**: CI/CD integration and programmable testing
4. **Collaboration**: Team workspaces and sharing capabilities

---

## Technical Stack Recommendations

### Frontend
- **Framework**: Next.js 14+ (React with App Router)
  - Server-side rendering for SEO
  - API routes for backend functionality
  - Built-in optimization
- **UI Library**: shadcn/ui + Tailwind CSS
  - Modern, accessible components
  - Highly customizable
- **State Management**: Zustand or React Query
- **Real-time**: Socket.io or Server-Sent Events (SSE)
- **Code Display**: Monaco Editor or CodeMirror
- **Syntax Highlighting**: Prism.js or Shiki

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js or Fastify
- **Database**: **SQLite (local file-based) + Redis (caching/sessions)**
- **ORM**: **Prisma** (SQLite adapter)
- **Authentication**: NextAuth.js or Clerk
- **File Storage**: AWS S3 or Cloudflare R2
- **Queue System**: BullMQ (Redis-based) for async tasks

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend)
- **Database**: **Local SQLite** (Prisma-managed single file)
- **CDN**: Cloudflare
- **Monitoring**: Sentry (errors) + PostHog (analytics)
- **Email**: Resend or SendGrid

### DevOps
- **CI/CD**: GitHub Actions
- **Testing**: Jest + Playwright
- **Linting**: ESLint + Prettier
- **Documentation**: Docusaurus or Mintlify

---

## System Architecture

### High-Level Architecture
```
┌─────────────────┐         ┌──────────────────┐
│   Web Client    │◄────────┤   CDN/Edge       │
│   (Next.js)     │         │   (Cloudflare)   │
└────────┬────────┘         └──────────────────┘
         │
         │ HTTPS/WSS
         │
┌────────▼────────────────────────────────────────┐
│         Application Server (Node.js)            │
│  ┌──────────────┐  ┌────────────────────────┐  │
│  │   API Layer  │  │  WebSocket/SSE Server  │  │
│  └──────┬───────┘  └───────────┬────────────┘  │
│         │                      │                │
│  ┌──────▼──────────────────────▼─────────────┐ │
│  │        Business Logic Layer                │ │
│  │  - Endpoint Management                     │ │
│  │  - Webhook Processing                      │ │
│  │  - Auth & Authorization                    │ │
│  └──────┬─────────────────────────────────────┘ │
└─────────┼──────────────────────────────────────┘
          │
    ┌─────┴──────┐
    │            │
┌───▼──────┐ ┌──▼────────┐
│  SQLite  │ │   Redis   │
│(Prisma)  │ │(Cache/Q)  │
└──────────┘ └──────────┘
```

### Data Flow for Incoming Webhooks
1. Webhook hits unique endpoint (e.g., `/w/{unique_id}`)
2. Request intercepted by middleware (validation, rate limiting)
3. Full request data captured (headers, body, metadata)
4. Stored in **SQLite** via Prisma with reference to endpoint
5. Event published to Redis pub/sub
6. WebSocket/SSE pushes update to connected clients
7. Optional: Trigger forwarding, chaining, or automation

---

## Database Schema (Prisma SQLite)

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  passwordHash String?
  plan      String   @default("free")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  endpoints Endpoint[]
  workspaces Workspace[]

  @@map("users")
}

model Endpoint {
  id              String   @id @default(uuid())
  userId          String
  uniqueSlug      String   @unique
  name            String?
  description     String?
  customDomain    String?
  expiresAt       DateTime?
  maxRequests     Int      @default(100)
  responseStatus  Int      @default(200)
  responseHeaders Json?
  responseBody    String?
  forwardUrl      String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  requests Request[]

  @@index([uniqueSlug])
  @@index([userId])
  @@map("endpoints")
}

model Request {
  id             String   @id @default(uuid())
  endpointId     String
  method         String
  path           String?
  queryParams    Json?
  headers        Json?
  body           String?
  bodySize       Int?
  contentType    String?
  ipAddress      String?
  userAgent      String?
  timestamp      DateTime @default(now())
  processingTimeMs Int?

  endpoint Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId])
  @@index([timestamp(sort: Desc)])
  @@map("requests")
}

model Workspace {
  id        String   @id @default(uuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())

  owner       User              @relation("WorkspaceOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     WorkspaceMember[]
  endpoints   Endpoint[]

  @@map("workspaces")
}

model WorkspaceMember {
  workspaceId String
  userId      String
  role        String @default("member")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@map("workspace_members")
}
```

### `.env` Configuration
```env
DATABASE_URL="file:./dev.db"
```

---

## API Endpoints Structure

### Public Webhook Receiver
- `POST/GET/PUT/PATCH/DELETE /w/{unique_slug}` - Capture any webhook
- `OPTIONS /w/{unique_slug}` - CORS preflight

### API Endpoints (Authenticated)
- **Endpoints Management**
  - `POST /api/endpoints` - Create new endpoint
  - `GET /api/endpoints` - List user's endpoints
  - `GET /api/endpoints/{id}` - Get endpoint details
  - `PATCH /api/endpoints/{id}` - Update endpoint
  - `DELETE /api/endpoints/{id}` - Delete endpoint

- **Requests Management**
  - `GET /api/endpoints/{id}/requests` - List captured requests
  - `GET /api/requests/{id}` - Get request details
  - `DELETE /api/requests/{id}` - Delete request
  - `POST /api/requests/{id}/replay` - Replay request

- **User Management**
  - `GET /api/user/profile` - Get user profile
  - `PATCH /api/user/profile` - Update profile
  - `GET /api/user/usage` - Get usage statistics

---

## Authentication & Authorization

### Authentication Strategy
- JWT-based authentication with refresh tokens
- Support for OAuth providers (Google, GitHub)
- API keys for programmatic access (CLI, CI/CD)

### Rate Limiting
- Anonymous: 100 requests/hour per IP
- Free: 1000 requests/day
- Pro: 50,000 requests/day

---

## Development Workflow

### Setup Commands
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

---
```