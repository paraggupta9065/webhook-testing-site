# Phase 2: Enhanced Debugging - Implementation Guide

## Overview
Transform basic request viewing into a powerful debugging toolkit that gives developers deep insight into their webhooks.

**Timeline**: 3-4 weeks  
**Priority**: HIGH - Key differentiator from competitors

---

## Features Breakdown

### 1. Interactive JSON/XML Tree View
**User Story**: As a developer, I want to explore nested JSON/XML structures without getting overwhelmed by raw text.

**Technical Requirements**:
- Collapsible/expandable nodes
- Visual hierarchy with indentation
- Type indicators (string, number, boolean, null, array, object)
- Copy individual values or paths
- Search within tree
- Path breadcrumbs (e.g., `data.user.addresses[0].city`)

**Implementation**:
```typescript
// components/JsonTreeViewer.tsx
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { useState } from 'react';

interface TreeNodeProps {
  name: string;
  value: any;
  path: string;
  depth: number;
}

export function JsonTreeViewer({ data }: { data: any }) {
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[600px]">
      <TreeNode name="root" value={data} path="" depth={0} />
    </div>
  );
}

function TreeNode({ name, value, path, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  
  const currentPath = path ? `${path}.${name}` : name;
  const isExpandable = typeof value === 'object' && value !== null;
  const valueType = Array.isArray(value) ? 'array' : typeof value;
  
  const copyPath = () => {
    navigator.clipboard.writeText(currentPath);
    toast.success('Path copied!');
  };
  
  const copyValue = () => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(stringValue);
    toast.success('Value copied!');
  };
  
  if (!isExpandable) {
    // Leaf node
    return (
      <div className="flex items-center gap-2 py-1 hover:bg-gray-800 px-2 rounded group">
        <span className="text-purple-400">{name}:</span>
        <span className={getValueColor(value)}>{formatValue(value)}</span>
        <button
          onClick={copyValue}
          className="opacity-0 group-hover:opacity-100 transition"
        >
          <Copy className="h-3 w-3 text-gray-500 hover:text-gray-300" />
        </button>
      </div>
    );
  }
  
  // Branch node
  const childCount = Array.isArray(value) ? value.length : Object.keys(value).length;
  
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 hover:bg-gray-800 px-2 rounded cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        <span className="text-purple-400">{name}:</span>
        <span className="text-gray-500 text-xs">
          {valueType} ({childCount} {childCount === 1 ? 'item' : 'items'})
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyPath();
          }}
          className="opacity-0 group-hover:opacity-100 transition"
        >
          <Copy className="h-3 w-3 text-gray-500 hover:text-gray-300" />
        </button>
      </div>
      
      {isExpanded && (
        <div className="ml-4 border-l border-gray-700 pl-2">
          {Array.isArray(value) ? (
            value.map((item, index) => (
              <TreeNode
                key={index}
                name={`[${index}]`}
                value={item}
                path={currentPath}
                depth={depth + 1}
              />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <TreeNode
                key={key}
                name={key}
                value={val}
                path={currentPath}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function getValueColor(value: any): string {
  if (value === null) return 'text-gray-500';
  if (typeof value === 'string') return 'text-green-400';
  if (typeof value === 'number') return 'text-blue-400';
  if (typeof value === 'boolean') return 'text-yellow-400';
  return 'text-gray-300';
}

function formatValue(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}
```

**XML Tree View**:
```typescript
// utils/xmlParser.ts
import { XMLParser } from 'fast-xml-parser';

export function parseXmlToTree(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });
  
  try {
    return parser.parse(xmlString);
  } catch (error) {
    console.error('XML parsing failed:', error);
    return null;
  }
}
```

---

### 2. Automatic Decoding
**User Story**: As a developer, I want to automatically decode base64, JWT, and URL-encoded data without manual tools.

**Technical Requirements**:
- Detect and decode:
  - Base64 strings
  - JWT tokens (with header/payload display)
  - URL-encoded strings
  - HTML entities
  - Gzip/deflate compressed data
- One-click toggle between encoded/decoded view
- Visual indicator when data is encoded

**Implementation**:
```typescript
// utils/decoders.ts

export function detectAndDecode(value: string): DecodedResult {
  const decoders = [
    detectJWT,
    detectBase64,
    detectUrlEncoded,
    detectHtmlEntities,
  ];
  
  for (const decoder of decoders) {
    const result = decoder(value);
    if (result) return result;
  }
  
  return { type: 'plain', value, decoded: value };
}

function detectJWT(value: string): DecodedResult | null {
  // JWT pattern: xxxxx.yyyyy.zzzzz
  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  
  if (!jwtPattern.test(value)) return null;
  
  try {
    const [headerB64, payloadB64, signature] = value.split('.');
    
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    
    return {
      type: 'jwt',
      value,
      decoded: { header, payload, signature },
    };
  } catch {
    return null;
  }
}

function detectBase64(value: string): DecodedResult | null {
  // Base64 pattern (must be reasonable length)
  if (value.length < 20 || value.length > 10000) return null;
  
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Pattern.test(value)) return null;
  
  try {
    const decoded = atob(value);
    
    // Check if decoded value is printable
    if (!/^[\x20-\x7E\s]*$/.test(decoded)) return null;
    
    return {
      type: 'base64',
      value,
      decoded,
    };
  } catch {
    return null;
  }
}

function detectUrlEncoded(value: string): DecodedResult | null {
  if (!value.includes('%')) return null;
  
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      return {
        type: 'url-encoded',
        value,
        decoded,
      };
    }
  } catch {
    return null;
  }
  
  return null;
}

function detectHtmlEntities(value: string): DecodedResult | null {
  if (!value.includes('&')) return null;
  
  const decoded = he.decode(value);
  if (decoded !== value) {
    return {
      type: 'html-entities',
      value,
      decoded,
    };
  }
  
  return null;
}
```

**UI Component**:
```typescript
// components/DecodedValue.tsx
export function DecodedValue({ value }: { value: string }) {
  const [showDecoded, setShowDecoded] = useState(true);
  const decodedResult = useMemo(() => detectAndDecode(value), [value]);
  
  if (decodedResult.type === 'plain') {
    return <span>{value}</span>;
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{decodedResult.type}</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDecoded(!showDecoded)}
        >
          {showDecoded ? 'Show Original' : 'Show Decoded'}
        </Button>
      </div>
      
      {showDecoded ? (
        decodedResult.type === 'jwt' ? (
          <JWTViewer data={decodedResult.decoded} />
        ) : (
          <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
            {typeof decodedResult.decoded === 'string'
              ? decodedResult.decoded
              : JSON.stringify(decodedResult.decoded, null, 2)}
          </pre>
        )
      ) : (
        <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-gray-500">
          {value}
        </pre>
      )}
    </div>
  );
}

function JWTViewer({ data }: { data: { header: any; payload: any; signature: string } }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm mb-1">Header</h4>
        <CodeBlock language="json" code={JSON.stringify(data.header, null, 2)} />
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Payload</h4>
        <CodeBlock language="json" code={JSON.stringify(data.payload, null, 2)} />
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-1">Signature</h4>
        <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
          {data.signature}
        </code>
      </div>
    </div>
  );
}
```

---

### 3. Advanced Filtering with Regex
**User Story**: As a developer, I want to use powerful filters to find specific requests quickly.

**Technical Requirements**:
- Regex search in body, headers, and query params
- Case-sensitive/insensitive toggle
- Save filter presets
- Filter by content type
- Filter by body size range
- Multiple filter combination (AND/OR logic)

**Implementation**:
```typescript
// components/AdvancedFilters.tsx
export function AdvancedFilters() {
  const [filters, setFilters] = useState<FilterState>({
    methods: [],
    contentTypes: [],
    searchQuery: '',
    useRegex: false,
    caseSensitive: false,
    bodySizeMin: null,
    bodySizeMax: null,
    dateRange: { from: null, to: null },
  });
  
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  
  return (
    <div className="space-y-4 border rounded-lg p-4">
      {/* Search */}
      <div className="space-y-2">
        <Label>Search Content</Label>
        <div className="flex gap-2">
          <Input
            placeholder={filters.useRegex ? "Regex pattern..." : "Search..."}
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          />
          <Toggle
            pressed={filters.useRegex}
            onPressedChange={(pressed) => setFilters({ ...filters, useRegex: pressed })}
          >
            <Code className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={filters.caseSensitive}
            onPressedChange={(pressed) => setFilters({ ...filters, caseSensitive: pressed })}
          >
            Aa
          </Toggle>
        </div>
      </div>
      
      {/* Method Filter */}
      <div className="space-y-2">
        <Label>HTTP Methods</Label>
        <div className="flex flex-wrap gap-2">
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
            <Toggle
              key={method}
              pressed={filters.methods.includes(method)}
              onPressedChange={(pressed) => {
                setFilters({
                  ...filters,
                  methods: pressed
                    ? [...filters.methods, method]
                    : filters.methods.filter((m) => m !== method),
                });
              }}
            >
              {method}
            </Toggle>
          ))}
        </div>
      </div>
      
      {/* Content Type */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <MultiSelect
          options={[
            'application/json',
            'application/xml',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain',
          ]}
          value={filters.contentTypes}
          onChange={(types) => setFilters({ ...filters, contentTypes: types })}
        />
      </div>
      
      {/* Body Size Range */}
      <div className="space-y-2">
        <Label>Body Size (bytes)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.bodySizeMin || ''}
            onChange={(e) => setFilters({ ...filters, bodySizeMin: parseInt(e.target.value) || null })}
          />
          <span className="self-center">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.bodySizeMax || ''}
            onChange={(e) => setFilters({ ...filters, bodySizeMax: parseInt(e.target.value) || null })}
          />
        </div>
      </div>
      
      {/* Preset Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => savePreset(filters)}>
          Save Preset
        </Button>
        {savedPresets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Load Preset
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {savedPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => setFilters(preset.filters)}
                >
                  {preset.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="ghost" onClick={() => setFilters(defaultFilters)}>
          Clear All
        </Button>
      </div>
    </div>
  );
}
```

**Filtering Logic**:
```typescript
// utils/filterRequests.ts
export function filterRequests(requests: Request[], filters: FilterState): Request[] {
  return requests.filter((request) => {
    // Method filter
    if (filters.methods.length > 0 && !filters.methods.includes(request.method)) {
      return false;
    }
    
    // Content type filter
    if (filters.contentTypes.length > 0) {
      const matchesContentType = filters.contentTypes.some((ct) =>
        request.contentType?.includes(ct)
      );
      if (!matchesContentType) return false;
    }
    
    // Body size filter
    if (filters.bodySizeMin !== null && request.bodySize < filters.bodySizeMin) {
      return false;
    }
    if (filters.bodySizeMax !== null && request.bodySize > filters.bodySizeMax) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange.from && request.timestamp < filters.dateRange.from) {
      return false;
    }
    if (filters.dateRange.to && request.timestamp > filters.dateRange.to) {
      return false;
    }
    
    // Search query
    if (filters.searchQuery) {
      const searchableContent = JSON.stringify({
        body: request.body,
        headers: request.headers,
        queryParams: request.queryParams,
      });
      
      if (filters.useRegex) {
        try {
          const regex = new RegExp(
            filters.searchQuery,
            filters.caseSensitive ? '' : 'i'
          );
          if (!regex.test(searchableContent)) {
            return false;
          }
        } catch (error) {
          // Invalid regex, skip
          return false;
        }
      } else {
        const query = filters.caseSensitive
          ? filters.searchQuery
          : filters.searchQuery.toLowerCase();
        const content = filters.caseSensitive
          ? searchableContent
          : searchableContent.toLowerCase();
        
        if (!content.includes(query)) {
          return false;
        }
      }
    }
    
    return true;
  });
}
```

---

### 4. Diff View (Compare Requests)
**User Story**: As a developer, I want to compare two similar webhooks to see what changed.

**Implementation**:
```typescript
// components/RequestDiff.tsx
import { diffLines, diffJson } from 'diff';

export function RequestDiff({ request1, request2 }: { request1: Request; request2: Request }) {
  const [compareMode, setCompareMode] = useState<'body' | 'headers' | 'all'>('body');
  
  const diff = useMemo(() => {
    if (compareMode === 'body') {
      return diffJson(
        parseJsonSafely(request1.body),
        parseJsonSafely(request2.body)
      );
    } else if (compareMode === 'headers') {
      return diffJson(request1.headers, request2.headers);
    } else {
      return diffJson(
        { headers: request1.headers, body: parseJsonSafely(request1.body) },
        { headers: request2.headers, body: parseJsonSafely(request2.body) }
      );
    }
  }, [request1, request2, compareMode]);
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={compareMode === 'body' ? 'default' : 'outline'}
          onClick={() => setCompareMode('body')}
        >
          Body
        </Button>
        <Button
          variant={compareMode === 'headers' ? 'default' : 'outline'}
          onClick={() => setCompareMode('headers')}
        >
          Headers
        </Button>
        <Button
          variant={compareMode === 'all' ? 'default' : 'outline'}
          onClick={() => setCompareMode('all')}
        >
          All
        </Button>
      </div>
      
      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto">
        {diff.map((part, index) => (
          <span
            key={index}
            className={
              part.added
                ? 'bg-green-900 text-green-200'
                : part.removed
                ? 'bg-red-900 text-red-200'
                : ''
            }
          >
            {part.value}
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

### 5. Request Replay with Editing
**User Story**: As a developer, I want to replay a webhook with modified data to test different scenarios.

**Implementation**:
```typescript
// components/RequestReplay.tsx
export function RequestReplay({ request }: { request: Request }) {
  const [editedRequest, setEditedRequest] = useState({
    method: request.method,
    headers: JSON.stringify(request.headers, null, 2),
    body: request.body,
  });
  
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  
  const handleReplay = async () => {
    setIsReplaying(true);
    
    try {
      const headers = JSON.parse(editedRequest.headers);
      
      const response = await fetch(`/api/requests/${request.id}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: editedRequest.method,
          headers,
          body: editedRequest.body,
        }),
      });
      
      const result = await response.json();
      setReplayResult(result);
    } catch (error) {
      toast.error('Replay failed');
    } finally {
      setIsReplaying(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Method</Label>
        <Select
          value={editedRequest.method}
          onValueChange={(method) => setEditedRequest({ ...editedRequest, method })}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
            <SelectItem key={method} value={method}>
              {method}
            </SelectItem>
          ))}
        </Select>
      </div>
      
      <div>
        <Label>Headers (JSON)</Label>
        <Textarea
          className="font-mono text-sm"
          rows={8}
          value={editedRequest.headers}
          onChange={(e) => setEditedRequest({ ...editedRequest, headers: e.target.value })}
        />
      </div>
      
      <div>
        <Label>Body</Label>
        <Textarea
          className="font-mono text-sm"
          rows={12}
          value={editedRequest.body}
          onChange={(e) => setEditedRequest({ ...editedRequest, body: e.target.value })}
        />
      </div>
      
      <Button onClick={handleReplay} disabled={isReplaying}>
        {isReplaying ? 'Replaying...' : 'Replay Request'}
      </Button>
      
      {replayResult && (
        <div className="mt-4 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Replay Result</h4>
          <div className="space-y-2 text-sm">
            <div>Status: {replayResult.status}</div>
            <div>New Request ID: {replayResult.newRequestId}</div>
            <Link href={`/requests/${replayResult.newRequestId}`}>
              View New Request →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Database Schema Updates

```sql
-- Migration: 002_phase2_features.sql

-- Add filter presets
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_filter_presets_user_id ON filter_presets(user_id);

-- Add request metadata for better filtering
ALTER TABLE requests ADD COLUMN is_replayed BOOLEAN DEFAULT false;
ALTER TABLE requests ADD COLUMN parent_request_id UUID REFERENCES requests(id);

CREATE INDEX idx_requests_content_type ON requests(content_type);
CREATE INDEX idx_requests_body_size ON requests(body_size);
```

---

## Performance Optimizations

1. **Lazy Loading for Tree View**: Only render visible nodes
2. **Virtual Scrolling**: For large request lists
3. **Debounced Search**: Wait 300ms before filtering
4. **Memoization**: Cache decoded values and diffs
5. **Web Workers**: For heavy regex operations

---

## Testing Checklist

- [ ] Tree view renders nested objects correctly
- [ ] All decoder types work (JWT, base64, URL-encoded)
- [ ] Regex filter handles invalid patterns gracefully
- [ ] Diff view accurately highlights changes
- [ ] Request replay preserves original data
- [ ] Filter presets save and load correctly
- [ ] Binary preview works for images/PDFs

---

## Launch Criteria
- All Phase 2 features functional
- No performance degradation from Phase 1
- Mobile responsive
- Accessibility tested
- Documentation updated
