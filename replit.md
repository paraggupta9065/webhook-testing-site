# HookTest - Webhook Testing & Tunneling Application

## Overview

HookTest is a full-stack webhook testing and tunneling application that allows developers to:
- Generate unique webhook URLs for testing
- View incoming webhook requests in real-time on a dashboard
- Forward webhook requests to localhost via a CLI agent

The application follows a monolithic architecture with a Node.js/Express backend serving a React/Vite frontend, using WebSockets for real-time communication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled with Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, with WebSocket integration for real-time updates
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth UI transitions
- **Key Pages**:
  - Home (`/`): Auto-creates a webhook session and redirects to dashboard
  - Dashboard (`/:id`): Displays webhook URL, request history sidebar, and request details

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time**: Socket.IO for bidirectional WebSocket communication
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Key Endpoints**:
  - `POST /api/webhooks`: Create new webhook session
  - `GET /api/webhooks/:id`: Get webhook details
  - `GET /api/webhooks/:id/requests`: List captured requests
  - `ALL /webhook/:id`: Ingestion endpoint that captures and forwards requests

### WebSocket Events
- `join-dashboard`: Client joins room to receive real-time request updates
- `register-tunnel`: CLI agent registers to receive requests for forwarding
- `new-request`: Broadcasts new incoming requests to dashboard clients
- `tunnel-request`: Sends request data to CLI agent for local forwarding

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema** (defined in `shared/schema.ts`):
  - `webhooks`: Stores webhook sessions (id, name, createdAt)
  - `requests`: Stores captured requests (id, webhookId, method, path, headers, body, query, timestamp)
- **Development Storage**: In-memory Map-based storage available in `server/storage.ts`

### CLI Agent
- Standalone Node.js script (`cli.js`) using Socket.IO client
- Connects to server, registers for a webhook ID, and forwards requests to localhost
- Usage: `node cli.js <WEBHOOK_ID> <LOCAL_PORT> [SERVER_URL]`

## External Dependencies

### Database
- PostgreSQL (configured via `DATABASE_URL` environment variable)
- Drizzle Kit for migrations (`npm run db:push`)

### Key NPM Packages
- **Backend**: express, socket.io, drizzle-orm, pg, zod
- **Frontend**: react, socket.io-client, @tanstack/react-query, framer-motion, react-syntax-highlighter
- **UI Components**: Full shadcn/ui component library with Radix UI primitives
- **CLI**: socket.io-client, axios

### Build & Development
- Vite for frontend bundling with HMR
- esbuild for production server bundling
- TypeScript throughout with shared types between client and server