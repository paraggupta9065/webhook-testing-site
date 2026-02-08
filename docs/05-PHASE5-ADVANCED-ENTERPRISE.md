# Phase 5: Advanced Features & Enterprise - Implementation Guide

## Overview
Add AI-powered analysis, team collaboration, analytics dashboards, and enterprise-grade features that justify premium pricing.

**Timeline**: 12-16 weeks  
**Priority**: MEDIUM - Revenue driver, competitive advantage

---

# AI-POWERED FEATURES

## 1. AI Payload Analysis
**User Story**: As a developer, I want AI to explain what a complex webhook payload means.

**Technical Requirements**:
- Automatic schema detection and documentation
- Natural language explanation of payload structure
- Anomaly detection (unexpected fields, type mismatches)
- Intelligent suggestions for improvements

**Implementation**:
```typescript
// lib/ai/payloadAnalyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AIPayloadAnalyzer {
  async analyzePayload(request: Request): Promise<AIAnalysis> {
    const prompt = `Analyze this webhook payload and provide:
1. A clear explanation of what this webhook represents
2. The schema/structure of the data
3. Any potential issues or anomalies
4. Suggestions for improvement

Webhook Details:
- Method: ${request.method}
- Content-Type: ${request.contentType}
- Headers: ${JSON.stringify(request.headers, null, 2)}
- Body: ${request.body}

Provide a structured analysis.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = message.content[0].text;
    
    return {
      summary: this.extractSection(analysis, 'explanation'),
      schema: this.extractSchema(request.body),
      issues: this.extractSection(analysis, 'issues'),
      suggestions: this.extractSection(analysis, 'suggestions'),
      confidence: 0.85,
    };
  }

  async detectSchema(body: string): Promise<JSONSchema> {
    try {
      const parsed = JSON.parse(body);
      return this.generateSchemaFromObject(parsed);
    } catch {
      return null;
    }
  }

  private generateSchemaFromObject(obj: any, path: string = ''): JSONSchema {
    if (typeof obj !== 'object' || obj === null) {
      return { type: typeof obj, path };
    }

    if (Array.isArray(obj)) {
      return {
        type: 'array',
        path,
        items: obj.length > 0 ? this.generateSchemaFromObject(obj[0], `${path}[0]`) : {},
      };
    }

    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      properties[key] = this.generateSchemaFromObject(value, `${path}.${key}`);
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      path,
      properties,
      required,
    };
  }

  async findAnomalies(request: Request, historicalRequests: Request[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Compare schema with historical data
    const currentSchema = await this.detectSchema(request.body);
    const historicalSchemas = await Promise.all(
      historicalRequests.map(r => this.detectSchema(r.body))
    );
    
    // Find new or missing fields
    const allFields = new Set<string>();
    historicalSchemas.forEach(schema => {
      this.extractPaths(schema).forEach(path => allFields.add(path));
    });
    
    const currentPaths = new Set(this.extractPaths(currentSchema));
    
    // New fields
    currentPaths.forEach(path => {
      if (!allFields.has(path)) {
        anomalies.push({
          type: 'new-field',
          path,
          severity: 'low',
          message: `New field detected: ${path}`,
        });
      }
    });
    
    // Missing fields
    allFields.forEach(path => {
      if (!currentPaths.has(path)) {
        anomalies.push({
          type: 'missing-field',
          path,
          severity: 'medium',
          message: `Expected field missing: ${path}`,
        });
      }
    });
    
    // Type changes
    // ... additional anomaly detection logic
    
    return anomalies;
  }

  private extractPaths(schema: JSONSchema, prefix: string = ''): string[] {
    if (!schema || !schema.properties) return [];
    
    const paths: string[] = [];
    for (const [key, value] of Object.entries(schema.properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      
      if (value.type === 'object') {
        paths.push(...this.extractPaths(value, path));
      }
    }
    
    return paths;
  }
}
```

**UI Component**:
```typescript
// components/AIAnalysisPanel.tsx
export function AIAnalysisPanel({ request }: { request: Request }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await fetch(`/api/requests/${request.id}/analyze`, {
        method: 'POST',
      });
      setAnalysis(await result.json());
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI Analysis</h3>
        <Button onClick={runAnalysis} disabled={loading} size="sm">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze with AI
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{analysis.summary}</p>
            </CardContent>
          </Card>

          {analysis.issues && analysis.issues.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Potential Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.schema && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detected Schema</CardTitle>
              </CardHeader>
              <CardContent>
                <SchemaViewer schema={analysis.schema} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 2. Natural Language Search
**User Story**: As a developer, I want to search my webhooks using plain English.

**Implementation**:
```typescript
// lib/ai/naturalLanguageSearch.ts
export class NaturalLanguageSearch {
  async search(query: string, requests: Request[]): Promise<Request[]> {
    // Convert natural language to filter criteria using AI
    const filters = await this.parseSearchQuery(query);
    
    // Apply filters
    return this.applyFilters(requests, filters);
  }

  private async parseSearchQuery(query: string): Promise<SearchFilters> {
    const prompt = `Convert this natural language search query into structured filters for webhook requests:

Query: "${query}"

Provide a JSON response with these possible filters:
- methods: array of HTTP methods (GET, POST, etc.)
- dateRange: { from: ISO date, to: ISO date }
- statusCodes: array of numbers
- contentContains: string to search in body
- headerContains: { key: string, value: string }
- minBodySize: number in bytes
- maxBodySize: number in bytes

Examples:
"show me all failed payments from last week" →
{
  "contentContains": "payment",
  "dateRange": { "from": "2024-01-15T00:00:00Z", "to": "2024-01-22T00:00:00Z" },
  "statusCodes": [400, 402, 500]
}

"find POST requests with user@example.com" →
{
  "methods": ["POST"],
  "contentContains": "user@example.com"
}

Now convert: "${query}"`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {};
  }

  private applyFilters(requests: Request[], filters: SearchFilters): Request[] {
    return requests.filter(request => {
      // Method filter
      if (filters.methods?.length && !filters.methods.includes(request.method)) {
        return false;
      }

      // Date range
      if (filters.dateRange) {
        const timestamp = new Date(request.timestamp);
        if (filters.dateRange.from && timestamp < new Date(filters.dateRange.from)) {
          return false;
        }
        if (filters.dateRange.to && timestamp > new Date(filters.dateRange.to)) {
          return false;
        }
      }

      // Content search
      if (filters.contentContains) {
        const searchable = JSON.stringify({
          body: request.body,
          headers: request.headers,
        }).toLowerCase();
        
        if (!searchable.includes(filters.contentContains.toLowerCase())) {
          return false;
        }
      }

      // Body size
      if (filters.minBodySize && request.bodySize < filters.minBodySize) {
        return false;
      }
      if (filters.maxBodySize && request.bodySize > filters.maxBodySize) {
        return false;
      }

      return true;
    });
  }
}
```

**UI Component**:
```typescript
// components/NaturalLanguageSearch.tsx
export function NaturalLanguageSearch({ onSearch }: { onSearch: (results: Request[]) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/search/natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      const results = await response.json();
      onSearch(results);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
          <Input
            placeholder="Ask anything... e.g., 'show me all failed payments from last Tuesday'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <Badge
            key={example}
            variant="outline"
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => setQuery(example)}
          >
            {example}
          </Badge>
        ))}
      </div>
    </div>
  );
}

const EXAMPLE_QUERIES = [
  'show me POST requests from yesterday',
  'find webhooks with error status',
  'large payloads from last week',
  'requests with X-API-Key header',
];
```

---

# TEAM COLLABORATION

## 1. Workspaces & Teams
**User Story**: As a team lead, I want to share webhook endpoints with my team.

**Database Schema**:
```sql
-- Already defined in overview, adding details

CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Move endpoints to workspace level
ALTER TABLE endpoints ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX idx_endpoints_workspace ON endpoints(workspace_id);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_log_workspace ON activity_log(workspace_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
```

**Implementation**:
```typescript
// lib/workspace.ts
export class WorkspaceManager {
  async createWorkspace(ownerId: string, name: string): Promise<Workspace> {
    const workspace = await db.workspace.create({
      data: {
        name,
        ownerId,
      },
    });

    // Add owner as admin
    await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: ownerId,
        role: 'owner',
      },
    });

    await this.logActivity({
      workspaceId: workspace.id,
      userId: ownerId,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: workspace.id,
    });

    return workspace;
  }

  async inviteMember(
    workspaceId: string,
    email: string,
    role: 'admin' | 'member' | 'viewer',
    invitedBy: string
  ): Promise<Invitation> {
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await db.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
      },
    });

    // Send email
    await sendInvitationEmail(email, invitation);

    await this.logActivity({
      workspaceId,
      userId: invitedBy,
      action: 'member.invited',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email, role },
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = await db.workspaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation');
    }

    await db.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
    });

    await db.workspaceInvitation.delete({
      where: { id: invitation.id },
    });

    await this.logActivity({
      workspaceId: invitation.workspaceId,
      userId,
      action: 'member.joined',
      resourceType: 'workspace',
      resourceId: invitation.workspaceId,
    });
  }

  async checkPermission(
    userId: string,
    workspaceId: string,
    action: 'read' | 'write' | 'delete' | 'invite'
  ): Promise<boolean> {
    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!member) return false;

    const permissions = {
      owner: ['read', 'write', 'delete', 'invite'],
      admin: ['read', 'write', 'delete', 'invite'],
      member: ['read', 'write'],
      viewer: ['read'],
    };

    return permissions[member.role].includes(action);
  }

  private async logActivity(activity: ActivityLogEntry): Promise<void> {
    await db.activityLog.create({ data: activity });
  }
}
```

---

## 2. Comments & Collaboration
**User Story**: As a team member, I want to discuss specific webhooks with my colleagues.

**Database Schema**:
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_request ON comments(request_id);
CREATE INDEX idx_mentions_user ON comment_mentions(mentioned_user_id);
```

**Implementation**:
```typescript
// components/CommentsPanel.tsx
export function CommentsPanel({ request }: { request: Request }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    const comment = await createComment({
      requestId: request.id,
      content: newComment,
    });

    setComments([...comments, comment]);
    setNewComment('');

    // Process mentions
    const mentions = extractMentions(newComment);
    if (mentions.length > 0) {
      await notifyMentions(comment.id, mentions);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments</h3>

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment... Use @username to mention teammates"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button onClick={handleSubmit} disabled={!newComment.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
      <Avatar>
        <AvatarImage src={comment.user.avatar} />
        <AvatarFallback>{comment.user.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{comment.user.name}</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(comment.createdAt)} ago
          </span>
        </div>
        <p className="text-sm text-gray-700">
          {renderCommentWithMentions(comment.content)}
        </p>
      </div>
    </div>
  );
}

function renderCommentWithMentions(content: string): React.ReactNode {
  const parts = content.split(/(@[\w]+)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
```

---

# ANALYTICS & MONITORING

## 1. Analytics Dashboard
**User Story**: As a product manager, I want to see usage patterns and trends for our webhooks.

**Implementation**:
```typescript
// lib/analytics.ts
export class AnalyticsEngine {
  async getEndpointStats(endpointId: string, timeRange: TimeRange): Promise<EndpointStats> {
    const requests = await db.request.findMany({
      where: {
        endpointId,
        timestamp: {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });

    return {
      totalRequests: requests.length,
      requestsByMethod: this.groupBy(requests, 'method'),
      requestsByStatus: this.groupRequestsByStatus(requests),
      requestsOverTime: this.timeSeriesData(requests, timeRange),
      avgResponseTime: this.calculateAverage(requests, 'processingTimeMs'),
      avgBodySize: this.calculateAverage(requests, 'bodySize'),
      topUserAgents: this.topN(requests, 'userAgent', 10),
      topIPs: this.topN(requests, 'ipAddress', 10),
      errorRate: this.calculateErrorRate(requests),
    };
  }

  private timeSeriesData(requests: Request[], timeRange: TimeRange): TimeSeriesPoint[] {
    const bucketSize = this.determineBucketSize(timeRange);
    const buckets = new Map<number, number>();

    requests.forEach(req => {
      const bucketKey = Math.floor(req.timestamp.getTime() / bucketSize) * bucketSize;
      buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp),
        count,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private calculateErrorRate(requests: Request[]): number {
    // Assuming we track response status somehow
    const errors = requests.filter(r => {
      // This would depend on how you define "errors"
      // For example, body contains "error" or specific status codes
      return r.body.toLowerCase().includes('error');
    });

    return requests.length > 0 ? (errors.length / requests.length) * 100 : 0;
  }
}
```

**Dashboard UI**:
```typescript
// components/AnalyticsDashboard.tsx
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip } from 'recharts';

export function AnalyticsDashboard({ endpointId }: { endpointId: string }) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', endpointId, timeRange],
    queryFn: () => fetchAnalytics(endpointId, timeRange),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['24h', '7d', '30d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            onClick={() => setTimeRange(range as any)}
          >
            {range}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Total Requests"
          value={stats.totalRequests}
          icon={<Activity />}
        />
        <KPICard
          title="Avg Response Time"
          value={`${stats.avgResponseTime}ms`}
          icon={<Clock />}
        />
        <KPICard
          title="Error Rate"
          value={`${stats.errorRate.toFixed(2)}%`}
          icon={<AlertTriangle />}
          variant={stats.errorRate > 5 ? 'danger' : 'success'}
        />
        <KPICard
          title="Avg Payload Size"
          value={formatBytes(stats.avgBodySize)}
          icon={<Database />}
        />
      </div>

      {/* Requests Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Requests Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={800} height={300} data={stats.requestsOverTime}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => format(new Date(value), 'MMM d, HH:mm')}
            />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#8884d8" />
          </LineChart>
        </CardContent>
      </Card>

      {/* Method Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Requests by Method</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart width={400} height={250} data={stats.requestsByMethod}>
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top User Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topUserAgents.map((ua, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate max-w-[300px]">{ua.value}</span>
                  <span className="font-semibold">{ua.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 2. Alerting System
**User Story**: As a DevOps engineer, I want to be notified when webhooks fail or show unusual patterns.

**Implementation**:
```typescript
// lib/alerts.ts
export class AlertingSystem {
  async checkAlerts(endpoint: Endpoint): Promise<void> {
    const alertRules = await db.alertRule.findMany({
      where: { endpointId: endpoint.id, isActive: true },
    });

    for (const rule of alertRules) {
      const triggered = await this.evaluateRule(rule, endpoint);
      
      if (triggered) {
        await this.sendAlert(rule, endpoint);
      }
    }
  }

  private async evaluateRule(rule: AlertRule, endpoint: Endpoint): Promise<boolean> {
    const window = 60 * 60 * 1000; // 1 hour
    const requests = await db.request.findMany({
      where: {
        endpointId: endpoint.id,
        timestamp: { gte: new Date(Date.now() - window) },
      },
    });

    switch (rule.type) {
      case 'error-rate':
        const errorRate = this.calculateErrorRate(requests);
        return errorRate > rule.threshold;

      case 'request-volume':
        return requests.length > rule.threshold;

      case 'response-time':
        const avgTime = requests.reduce((sum, r) => sum + r.processingTimeMs, 0) / requests.length;
        return avgTime > rule.threshold;

      case 'no-requests':
        return requests.length === 0;

      default:
        return false;
    }
  }

  private async sendAlert(rule: AlertRule, endpoint: Endpoint): Promise<void> {
    const channels = rule.notificationChannels;

    for (const channel of channels) {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(channel.config.email, rule, endpoint);
          break;

        case 'slack':
          await this.sendSlackAlert(channel.config.webhookUrl, rule, endpoint);
          break;

        case 'webhook':
          await this.sendWebhookAlert(channel.config.url, rule, endpoint);
          break;
      }
    }

    // Log alert
    await db.alertLog.create({
      data: {
        ruleId: rule.id,
        endpointId: endpoint.id,
        message: rule.message,
        severity: rule.severity,
      },
    });
  }

  private async sendSlackAlert(webhookUrl: string, rule: AlertRule, endpoint: Endpoint): Promise<void> {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Alert: ${rule.name}`,
        attachments: [
          {
            color: rule.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Endpoint', value: endpoint.name, short: true },
              { title: 'Rule', value: rule.name, short: true },
              { title: 'Message', value: rule.message, short: false },
            ],
          },
        ],
      }),
    });
  }
}
```

---

## Database Schema Updates

```sql
-- Migration: 005_phase5_features.sql

-- Alert Rules
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- error-rate, request-volume, response-time, no-requests
  threshold NUMERIC NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- info, warning, critical
  message TEXT,
  notification_channels JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
  message TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Analysis Cache
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  schema JSONB,
  issues JSONB,
  suggestions JSONB,
  confidence NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_analyses_request ON ai_analyses(request_id);
```

---

## Performance & Cost Optimization

### AI Usage
- Cache AI analyses for 24 hours
- Batch similar requests
- Use cheaper models for simple tasks
- Implement rate limiting (5 analyses per hour on free tier)

### Analytics
- Pre-aggregate data hourly/daily
- Use materialized views for complex queries
- Cache dashboard data for 5 minutes
- Archive old request data to cold storage

### Real-time Features
- Use Redis pub/sub for scalability
- Implement connection pooling
- Graceful degradation when limits reached

---

## Testing Checklist
- [ ] AI analysis provides accurate insights
- [ ] Natural language search returns relevant results
- [ ] Workspace permissions enforced correctly
- [ ] Comments with mentions send notifications
- [ ] Analytics dashboard renders all charts
- [ ] Alerts trigger and notify correctly
- [ ] Performance meets targets under load

---

## Launch Criteria
- All Phase 5 features functional
- AI costs within budget
- Enterprise security audit passed
- SOC 2 compliance started
- Customer success team trained
- Pricing tiers finalized
