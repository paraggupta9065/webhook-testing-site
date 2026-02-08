# Phase 1: Core Foundation (MVP) - Implementation Guide

## Overview
Build the minimum viable product that allows users to create webhook endpoints, capture incoming requests, and view them in a clean interface.

**Timeline**: 3-4 weeks  
**Priority**: CRITICAL - Everything depends on this

---

## Features Breakdown

### 1. Unique Endpoint Generation
**User Story**: As a developer, I want to instantly create a unique URL that can receive webhooks.

**Technical Requirements**:
- Generate cryptographically secure random slugs (10-12 characters)
- Validate uniqueness in database
- Support optional custom names/descriptions
- Auto-expire endpoints after configurable duration (default: 24 hours)

**Implementation**:
```typescript
// utils/generateSlug.ts
import { randomBytes } from 'crypto';

export function generateUniqueSlug(length: number = 12): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[bytes[i] % characters.length];
  }
  
  return result;
}

// api/endpoints/create.ts
export async function createEndpoint(userId: string, options: CreateEndpointOptions) {
  let slug: string;
  let attempts = 0;
  const maxAttempts = 5;
  
  // Ensure uniqueness
  do {
    slug = generateUniqueSlug();
    const exists = await db.endpoint.findUnique({ where: { slug } });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique slug');
  }
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (options.expiryHours || 24));
  
  return await db.endpoint.create({
    data: {
      slug,
      userId,
      name: options.name || 'Untitled Endpoint',
      description: options.description,
      expiresAt,
      maxRequests: options.maxRequests || 100,
      isActive: true,
    }
  });
}
```

**UI Components**:
- "Create New Endpoint" button
- Modal/form with optional fields:
  - Name (optional)
  - Description (optional)
  - Expiry time (dropdown: 1h, 6h, 24h, 7d, never*)
- Success state showing the generated URL with copy button
- Visual feedback when URL is copied

---

### 2. Real-Time Webhook Capture
**User Story**: As a developer, when I send a webhook to my endpoint, I want to see it appear instantly without refreshing.

**Technical Requirements**:
- Accept all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- Capture complete request data:
  - Method
  - Path and query parameters
  - All headers
  - Raw body (with size limit: 10MB)
  - Content-Type
  - IP address
  - User-Agent
  - Timestamp (with millisecond precision)
- Store in database efficiently
- Push updates to connected clients via WebSocket or SSE

**Implementation**:
```typescript
// app/w/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishWebhookEvent } from '@/lib/realtime';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  return handleWebhook(req, params.slug, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  return handleWebhook(req, params.slug, 'POST');
}

// Repeat for PUT, PATCH, DELETE, OPTIONS...

async function handleWebhook(req: NextRequest, slug: string, method: string) {
  const startTime = Date.now();
  
  // Find endpoint
  const endpoint = await db.endpoint.findUnique({
    where: { slug, isActive: true }
  });
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  // Check if expired
  if (endpoint.expiresAt && new Date() > endpoint.expiresAt) {
    return NextResponse.json({ error: 'Endpoint expired' }, { status: 410 });
  }
  
  // Check request limit
  const requestCount = await db.request.count({
    where: { endpointId: endpoint.id }
  });
  
  if (requestCount >= endpoint.maxRequests) {
    return NextResponse.json({ error: 'Request limit reached' }, { status: 429 });
  }
  
  // Parse request data
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams);
  const headers = Object.fromEntries(req.headers);
  
  let body = '';
  let bodySize = 0;
  
  try {
    const rawBody = await req.text();
    body = rawBody;
    bodySize = Buffer.byteLength(rawBody);
    
    // 10MB limit
    if (bodySize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
  } catch (error) {
    console.error('Error reading body:', error);
  }
  
  // Store request
  const capturedRequest = await db.request.create({
    data: {
      endpointId: endpoint.id,
      method,
      path: url.pathname,
      queryParams,
      headers,
      body,
      bodySize,
      contentType: headers['content-type'] || 'text/plain',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    }
  });
  
  // Publish real-time event
  await publishWebhookEvent(endpoint.id, capturedRequest);
  
  // Return configured response
  return new NextResponse(
    endpoint.responseBody || 'OK',
    {
      status: endpoint.responseStatus || 200,
      headers: endpoint.responseHeaders as Record<string, string> || {},
    }
  );
}
```

**Real-Time Implementation (SSE)**:
```typescript
// app/api/endpoints/[id]/stream/route.ts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Redis pub/sub or use polling
      const subscription = await subscribeToEndpoint(params.id);
      
      subscription.on('message', (data) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      });
      
      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);
      
      // Cleanup
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### 3. Request Inspector UI
**User Story**: As a developer, I want to view all captured webhook details in an organized, readable format.

**UI Components**:

**Request List**:
```typescript
// components/RequestList.tsx
interface Request {
  id: string;
  method: string;
  timestamp: Date;
  contentType: string;
  bodySize: number;
}

export function RequestList({ requests }: { requests: Request[] }) {
  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  );
}

function RequestCard({ request }: { request: Request }) {
  const methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-500',
    PUT: 'bg-yellow-500',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500',
  };
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-white text-sm font-mono ${methodColors[request.method]}`}>
            {request.method}
          </span>
          <span className="text-sm text-gray-600">
            {formatDistanceToNow(request.timestamp)} ago
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {formatBytes(request.bodySize)}
        </div>
      </div>
    </div>
  );
}
```

**Request Details View**:
```typescript
// components/RequestDetails.tsx
export function RequestDetails({ request }: { request: FullRequest }) {
  const [activeTab, setActiveTab] = useState('body');
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{request.method} Request</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(request.body)}>
            Copy Body
          </Button>
          <Button variant="outline" onClick={() => downloadRequest(request)}>
            Download
          </Button>
        </div>
      </div>
      
      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <MetadataItem label="Timestamp" value={request.timestamp.toISOString()} />
        <MetadataItem label="Content-Type" value={request.contentType} />
        <MetadataItem label="IP Address" value={request.ipAddress} />
        <MetadataItem label="User-Agent" value={request.userAgent} />
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="query">Query Params</TabsTrigger>
        </TabsList>
        
        <TabsContent value="body">
          <CodeBlock language="json" code={formatBody(request.body, request.contentType)} />
        </TabsContent>
        
        <TabsContent value="headers">
          <KeyValueTable data={request.headers} />
        </TabsContent>
        
        <TabsContent value="query">
          <KeyValueTable data={request.queryParams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 4. Syntax Highlighting & Formatting
**Technical Requirements**:
- Auto-detect content type
- Pretty-print JSON and XML
- Syntax highlighting for common formats
- Fallback to raw text view

**Implementation**:
```typescript
// components/CodeBlock.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const formattedCode = useMemo(() => {
    if (language === 'json') {
      try {
        return JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        return code;
      }
    }
    return code;
  }, [code, language]);
  
  return (
    <div className="relative">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {formattedCode}
      </SyntaxHighlighter>
    </div>
  );
}
```

---

### 5. Basic Search & Filter
**Features**:
- Filter by HTTP method
- Search by content (headers, body)
- Date range filter
- Clear all filters

**Implementation**:
```typescript
// hooks/useRequestFilters.ts
export function useRequestFilters() {
  const [filters, setFilters] = useState({
    methods: [] as string[],
    search: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });
  
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Method filter
      if (filters.methods.length > 0 && !filters.methods.includes(req.method)) {
        return false;
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableContent = JSON.stringify({
          headers: req.headers,
          body: req.body,
          queryParams: req.queryParams,
        }).toLowerCase();
        
        if (!searchableContent.includes(searchLower)) {
          return false;
        }
      }
      
      // Date range
      if (filters.dateFrom && req.timestamp < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && req.timestamp > filters.dateTo) {
        return false;
      }
      
      return true;
    });
  }, [requests, filters]);
  
  return { filters, setFilters, filteredRequests };
}
```

---

### 6. Endpoint Management Dashboard
**Features**:
- List all user endpoints
- Show request count per endpoint
- Quick actions: view, copy URL, delete
- Expiry status indicator

**Implementation**:
```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  const { data: endpoints, isLoading } = useQuery({
    queryKey: ['endpoints'],
    queryFn: fetchUserEndpoints,
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Endpoints</h1>
        <Button onClick={createNewEndpoint}>
          <Plus className="mr-2 h-4 w-4" />
          New Endpoint
        </Button>
      </div>
      
      <div className="grid gap-4">
        {endpoints?.map((endpoint) => (
          <EndpointCard key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const isExpired = endpoint.expiresAt && new Date() > endpoint.expiresAt;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{endpoint.name}</CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              {window.location.origin}/w/{endpoint.slug}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyUrl(endpoint.slug)}>
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => viewEndpoint(endpoint.id)}>
                View Requests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteEndpoint(endpoint.id)} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{endpoint.requestCount} requests</span>
          <span>•</span>
          {isExpired ? (
            <span className="text-red-600">Expired</span>
          ) : endpoint.expiresAt ? (
            <span>Expires {formatDistanceToNow(endpoint.expiresAt)}</span>
          ) : (
            <span>Never expires</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Database Migrations

```sql
-- Migration: 001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  expires_at TIMESTAMP,
  max_requests INTEGER DEFAULT 100,
  response_status INTEGER DEFAULT 200,
  response_headers JSONB DEFAULT '{}',
  response_body TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_endpoints_slug ON endpoints(slug);
CREATE INDEX idx_endpoints_user_id ON endpoints(user_id);
CREATE INDEX idx_endpoints_expires_at ON endpoints(expires_at);

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500),
  query_params JSONB DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  body TEXT,
  body_size INTEGER DEFAULT 0,
  content_type VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  processing_time_ms INTEGER
);

CREATE INDEX idx_requests_endpoint_id ON requests(endpoint_id);
CREATE INDEX idx_requests_timestamp ON requests(timestamp DESC);
CREATE INDEX idx_requests_method ON requests(method);
```

---

## Testing Checklist

### Unit Tests
- [ ] Slug generation produces unique values
- [ ] Request capture handles all HTTP methods
- [ ] Body size limit is enforced
- [ ] Expired endpoints return 410
- [ ] Request limit is enforced

### Integration Tests
- [ ] Create endpoint → Send webhook → View request (full flow)
- [ ] Real-time updates work correctly
- [ ] Filters return correct results
- [ ] Endpoint deletion cascades to requests

### E2E Tests
- [ ] User can sign up and create endpoint
- [ ] Webhook appears in real-time
- [ ] Copy URL button works
- [ ] Request details display correctly

---

## Performance Targets (Phase 1)
- Endpoint creation: < 500ms
- Webhook capture: < 100ms
- Request list load: < 1s
- Real-time latency: < 200ms
- Support 100 concurrent connections per server

---

## Launch Checklist
- [ ] All features implemented and tested
- [ ] Database migrations run successfully
- [ ] Authentication working
- [ ] Deployed to production
- [ ] Monitoring set up (Sentry, analytics)
- [ ] Landing page live
- [ ] Documentation published
- [ ] Beta users invited
