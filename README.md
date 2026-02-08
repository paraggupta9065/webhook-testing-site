
# test-webhook.com - Webhook Testing Platform

A modern, developer-focused webhook testing platform built with React, Express, and SQLite. Create unique webhook endpoints, capture requests in real-time, and debug webhook integrations with ease.

---

## Features

### MVP (Current)
- **Unique Webhook Endpoints:** Instantly generate unique URLs for testing webhooks
- **Real-Time Dashboard:** View incoming webhook requests live with Socket.io
- **Request Inspection:** Detailed view of headers, body, query params, and metadata
- **Custom Response Configuration:** Configure status codes, headers, and response bodies
- **Request History:** Store and review up to 100 recent requests per endpoint
- **SQLite Database:** Lightweight, file-based storage with Drizzle ORM
- **JWT Authentication:** Secure user registration and login
- **Rate Limiting:** Built-in protection against abuse (100 req/hr anonymous, 1000 req/day free)
- **Modern UI:** Beautiful interface with shadcn/ui and Tailwind CSS

### Planned Features
- CLI tunneling agent for local development
- AI-powered webhook analysis
- Team workspaces and collaboration
- API key management
- Webhook forwarding and chaining
- Request replay functionality
- Advanced filtering and search
- CI/CD integration

---

## Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** SQLite with Drizzle ORM
- **Real-time:** Socket.io
- **Authentication:** JWT with bcrypt
- **Validation:** Zod

### Frontend
- **Framework:** React with Vite
- **Routing:** Wouter
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack Query
- **Real-time:** Socket.io Client
- **Animations:** Framer Motion

---

## Architecture

```
┌─────────────────┐         
│   Web Client    │         
│   (React/Vite)  │         
└────────┬────────┘         
         │ HTTPS/WSS
         │
┌────────▼────────────────┐
│  Express Server         │
│  ┌─────────────────┐   │
│  │  WebSocket      │   │
│  │  (Socket.io)    │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │  REST API       │   │
│  │  - Auth         │   │
│  │  - Endpoints    │   │
│  │  - Requests     │   │
│  └─────────────────┘   │
└────────┬────────────────┘
         │
    ┌────▼────┐
    │ SQLite  │
    │ (File)  │
    └─────────┘
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone the repository
```sh
git clone <repo-url>
cd Hook-Test
```

### 2. Install dependencies
```sh
npm install
```

### 3. Configure environment
```sh
cp .env.example .env
```

Edit `.env` and configure:
```env
DATABASE_URL=file:./dev.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

### 4. Initialize database
```sh
npm run db:push
```

This will create the SQLite database and apply the schema.

### 5. Start development server
```sh
npm run dev
```

The app will be available at `http://localhost:3000`

---

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

### Endpoint Management

#### Create Endpoint
```http
POST /api/webhooks
Authorization: Bearer <access_token> (optional)

{
  "name": "My Webhook",
  "description": "Testing webhook integration"
}
```

#### Get Endpoint
```http
GET /api/webhooks/:id
```

#### Update Response Configuration
```http
PATCH /api/webhooks/:id/response

{
  "responseStatus": 200,
  "responseHeaders": {"X-Custom": "Header"},
  "responseBody": "OK"
}
```

#### List Requests
```http
GET /api/webhooks/:id/requests
```

#### Clear Request History
```http
DELETE /api/webhooks/:id/requests
```

### Webhook Ingestion

Send webhook to your endpoint:
```http
POST /webhook/:slug
# Any HTTP method, headers, and body supported
```

---

## Database Schema

### Users
- `id` - UUID primary key
- `email` - Unique user email
- `username` - Optional username
- `passwordHash` - Hashed password
- `name` - User's display name
- `plan` - Subscription plan (free, pro, enterprise)
- `createdAt`, `updatedAt` - Timestamps

### Endpoints
- `id` - UUID primary key
- `userId` - Foreign key to users (nullable for anonymous)
- `uniqueSlug` - URL-friendly unique identifier
- `name`, `description` - Metadata
- `responseStatus` - HTTP status code to return
- `responseHeaders` - Custom headers (JSON)
- `responseBody` - Response content
- `isActive` - Enable/disable endpoint
- `maxRequests` - Request limit
- `expiresAt` - Optional expiration
- `createdAt`, `updatedAt` - Timestamps

### Requests
- `id` - UUID primary key
- `endpointId` - Foreign key to endpoints
- `method` - HTTP method
- `path` - Full request path
- `queryParams` - Query string (JSON)
- `headers` - Request headers (JSON)
- `body` - Request body
- `bodySize` - Size in bytes
- `contentType` - Content-Type header
- `ipAddress` - Client IP
- `userAgent` - User agent string
- `timestamp` - When request was received
- `processingTimeMs` - Processing duration

---

## Development Scripts

```sh
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Push database schema
npm run db:push
```

---

## Project Structure

```
Hook-Test/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # Page components
│   │   └── App.tsx        # App entry
│   ├── index.html
│   └── requirements.md
├── server/                 # Express backend
│   ├── auth.ts            # JWT authentication
│   ├── authRoutes.ts      # Auth endpoints
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry
│   ├── rateLimit.ts       # Rate limiting
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   └── vite.ts            # Vite dev server
├── shared/                 # Shared code
│   ├── routes.ts          # Route definitions
│   └── schema.ts          # Database schema
├── docs/                   # Documentation
│   └── 01-PROJECT-OVERVIEW.md
├── drizzle.config.ts      # Drizzle ORM config
├── package.json
└── README.md
```

---

## Rate Limits

- **Anonymous:** 100 requests/hour
- **Free Plan:** 1,000 requests/day
- **Pro Plan:** 50,000 requests/day

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT

---

## Support

For issues and questions, please open an issue on GitHub.
````
```env
DATABASE_URL=file:./dev.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

### 4. Initialize database
```sh
npm run db:push
```

This will create the SQLite database and apply the schema.

### 5. Start development server
```sh
npm run dev
```

The app will be available at `http://localhost:3000`
```sh
npm install
cd client && npm install
```

### 3. Development
```sh
npm run dev
```
- Starts both backend and frontend concurrently.

### 4. Production Build
```sh
npm run build
npm start
```

---

## Usage

### 1. Generate a Webhook URL
- Open the dashboard in your browser.
- On load, a unique webhook URL is generated for your session.

### 2. View Incoming Requests
- Send any HTTP request (POST, GET, etc.) to your unique webhook URL.
- Requests appear in real-time in the dashboard sidebar.
- Click a request to view headers and body.


### 3. Forward Requests to Your Server (Tunnel)
- Run the CLI agent in a separate terminal:
  ```sh
  node cli.js <UUID> <LOCAL_PORT>
  ```
- Example: `node cli.js 123e4567-e89b-12d3-a456-426614174000 3000`
- The CLI will forward incoming webhook requests to your local server (e.g., `http://localhost:3000`).

---

## Technologies Used
- **Backend:** Node.js, Express, Socket.io, ioredis, cors, dotenv
- **Frontend:** React, Vite, Tailwind CSS, framer-motion, date-fns, lucide-react, react-syntax-highlighter, clsx, tailwind-merge
- **CLI:** Node.js, socket.io-client, axios

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
[MIT](LICENSE)
