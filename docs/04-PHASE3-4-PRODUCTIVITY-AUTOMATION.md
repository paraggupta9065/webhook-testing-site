# Phase 3 & 4: Developer Productivity + Automation - Implementation Guide

## Overview
**Phase 3**: Integrate into daily development workflows with CLI tools, templates, and productivity features  
**Phase 4**: Enable automated testing, CI/CD integration, and programmable endpoints

**Combined Timeline**: 8-10 weeks  
**Priority**: MEDIUM-HIGH - Increases user stickiness and enables premium pricing

---

# PHASE 3: DEVELOPER PRODUCTIVITY

## 1. CLI Tool
**User Story**: As a developer, I want to interact with my webhook endpoints from the terminal.

**Features**:
- Create/list/delete endpoints
- Stream incoming requests in real-time
- Forward webhooks to localhost
- Export requests
- Configure custom responses

**Implementation**:
```typescript
// cli/src/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { createEndpoint, listEndpoints, deleteEndpoint } from './commands/endpoints';
import { streamRequests } from './commands/stream';
import { tunnel } from './commands/tunnel';
import { config } from './config';

const program = new Command();

program
  .name('webhook-cli')
  .description('CLI tool for webhook testing')
  .version('1.0.0');

// Init command - setup API key
program
  .command('init')
  .description('Initialize CLI with API key')
  .action(async () => {
    const apiKey = await promptForApiKey();
    await config.setApiKey(apiKey);
    console.log('✓ API key saved');
  });

// Create endpoint
program
  .command('create')
  .description('Create a new webhook endpoint')
  .option('-n, --name <name>', 'Endpoint name')
  .option('-e, --expires <hours>', 'Expiry time in hours', '24')
  .action(async (options) => {
    const endpoint = await createEndpoint({
      name: options.name,
      expiryHours: parseInt(options.expires),
    });
    
    console.log('✓ Endpoint created:');
    console.log(`  URL: ${endpoint.url}`);
    console.log(`  ID: ${endpoint.id}`);
  });

// List endpoints
program
  .command('list')
  .alias('ls')
  .description('List all endpoints')
  .action(async () => {
    const endpoints = await listEndpoints();
    
    console.table(endpoints.map(e => ({
      ID: e.id,
      Name: e.name,
      Requests: e.requestCount,
      Expires: e.expiresAt ? formatDate(e.expiresAt) : 'Never',
    })));
  });

// Stream requests
program
  .command('stream <endpoint-id>')
  .description('Stream incoming requests in real-time')
  .option('-f, --format <format>', 'Output format: json, table, raw', 'table')
  .action(async (endpointId, options) => {
    console.log(`Streaming requests for endpoint ${endpointId}...`);
    
    await streamRequests(endpointId, (request) => {
      if (options.format === 'json') {
        console.log(JSON.stringify(request, null, 2));
      } else if (options.format === 'table') {
        console.log(`\n[${request.timestamp}] ${request.method} ${request.path}`);
        console.log('Headers:', JSON.stringify(request.headers, null, 2));
        console.log('Body:', request.body);
      } else {
        console.log(request.body);
      }
    });
  });

// Tunnel to localhost
program
  .command('tunnel <port>')
  .description('Forward webhooks to localhost')
  .option('-e, --endpoint <id>', 'Endpoint ID (creates new if not provided)')
  .action(async (port, options) => {
    const endpointId = options.endpoint || (await createEndpoint({ name: 'Tunnel' })).id;
    
    console.log(`Tunneling webhooks to localhost:${port}...`);
    
    await tunnel({
      endpointId,
      localPort: parseInt(port),
      onRequest: (req) => {
        console.log(`→ ${req.method} ${req.path}`);
      },
      onResponse: (res) => {
        console.log(`← ${res.status}`);
      },
    });
  });

program.parse();
```

**Stream Implementation**:
```typescript
// cli/src/commands/stream.ts
import EventSource from 'eventsource';

export async function streamRequests(
  endpointId: string,
  onRequest: (request: any) => void
) {
  const apiKey = await config.getApiKey();
  const url = `${config.apiUrl}/api/endpoints/${endpointId}/stream`;
  
  const eventSource = new EventSource(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  eventSource.onmessage = (event) => {
    const request = JSON.parse(event.data);
    onRequest(request);
  };
  
  eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
  };
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    eventSource.close();
    process.exit(0);
  });
}
```

**Tunnel Implementation**:
```typescript
// cli/src/commands/tunnel.ts
import express from 'express';
import axios from 'axios';

export async function tunnel(options: TunnelOptions) {
  const { endpointId, localPort, onRequest, onResponse } = options;
  
  // Subscribe to endpoint
  await streamRequests(endpointId, async (request) => {
    onRequest(request);
    
    try {
      // Forward to localhost
      const response = await axios({
        method: request.method,
        url: `http://localhost:${localPort}${request.path}`,
        headers: request.headers,
        data: request.body,
        validateStatus: () => true, // Accept any status
      });
      
      onResponse({
        status: response.status,
        headers: response.headers,
        body: response.data,
      });
      
      // Send response back to webhook endpoint
      await sendTunnelResponse(endpointId, request.id, {
        status: response.status,
        headers: response.headers,
        body: response.data,
      });
      
    } catch (error) {
      console.error('Tunnel error:', error);
      onResponse({ status: 500, body: 'Tunnel error' });
    }
  });
}
```

---

## 2. Integration Templates
**User Story**: As a developer, I want pre-configured settings for popular webhook providers.

**Implementation**:
```typescript
// lib/templates.ts
export const WEBHOOK_TEMPLATES = {
  stripe: {
    name: 'Stripe Webhook',
    description: 'Receive Stripe payment webhooks',
    responseStatus: 200,
    responseBody: JSON.stringify({ received: true }),
    signatureValidation: {
      enabled: true,
      header: 'stripe-signature',
      secret: 'whsec_...',
      algorithm: 'sha256',
    },
    examplePayload: {
      id: 'evt_...',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_...',
          amount: 2000,
          currency: 'usd',
        },
      },
    },
  },
  
  github: {
    name: 'GitHub Webhook',
    description: 'Receive GitHub repository events',
    responseStatus: 200,
    signatureValidation: {
      enabled: true,
      header: 'x-hub-signature-256',
      secret: 'your-webhook-secret',
      algorithm: 'sha256',
    },
    examplePayload: {
      action: 'opened',
      number: 42,
      pull_request: {
        title: 'Fix bug',
        user: { login: 'octocat' },
      },
    },
  },
  
  shopify: {
    name: 'Shopify Webhook',
    description: 'Receive Shopify store events',
    responseStatus: 200,
    signatureValidation: {
      enabled: true,
      header: 'x-shopify-hmac-sha256',
      secret: 'your-shopify-secret',
      algorithm: 'sha256',
    },
    examplePayload: {
      id: 12345,
      email: 'customer@example.com',
      total_price: '99.99',
    },
  },
  
  slack: {
    name: 'Slack Event',
    description: 'Receive Slack workspace events',
    responseStatus: 200,
    responseBody: JSON.stringify({ challenge: '{{request.body.challenge}}' }),
    examplePayload: {
      type: 'url_verification',
      challenge: '3eZbrw...',
    },
  },
};

// UI Component
export function TemplateSelector({ onSelect }: { onSelect: (template: Template) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(WEBHOOK_TEMPLATES).map(([key, template]) => (
        <Card key={key} className="cursor-pointer hover:shadow-lg transition" onClick={() => onSelect(template)}>
          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" size="sm">Use Template</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

---

## 3. Custom Response Configuration
**User Story**: As a developer, I want to configure custom HTTP responses for my webhook endpoints.

**Implementation**:
```typescript
// components/ResponseConfiguration.tsx
export function ResponseConfiguration({ endpoint }: { endpoint: Endpoint }) {
  const [config, setConfig] = useState({
    status: endpoint.responseStatus || 200,
    headers: endpoint.responseHeaders || {},
    body: endpoint.responseBody || '',
    useTemplate: false,
  });
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Status Code</Label>
        <Select
          value={config.status.toString()}
          onValueChange={(value) => setConfig({ ...config, status: parseInt(value) })}
        >
          <SelectItem value="200">200 OK</SelectItem>
          <SelectItem value="201">201 Created</SelectItem>
          <SelectItem value="202">202 Accepted</SelectItem>
          <SelectItem value="204">204 No Content</SelectItem>
          <SelectItem value="400">400 Bad Request</SelectItem>
          <SelectItem value="401">401 Unauthorized</SelectItem>
          <SelectItem value="404">404 Not Found</SelectItem>
          <SelectItem value="500">500 Internal Server Error</SelectItem>
        </Select>
      </div>
      
      <div>
        <Label>Response Headers</Label>
        <KeyValueEditor
          data={config.headers}
          onChange={(headers) => setConfig({ ...config, headers })}
          placeholder={{ key: 'Content-Type', value: 'application/json' }}
        />
      </div>
      
      <div>
        <Label>Response Body</Label>
        <div className="flex gap-2 mb-2">
          <Button
            variant={config.useTemplate ? 'outline' : 'default'}
            size="sm"
            onClick={() => setConfig({ ...config, useTemplate: false })}
          >
            Static
          </Button>
          <Button
            variant={config.useTemplate ? 'default' : 'outline'}
            size="sm"
            onClick={() => setConfig({ ...config, useTemplate: true })}
          >
            Dynamic Template
          </Button>
        </div>
        
        {config.useTemplate ? (
          <>
            <Textarea
              className="font-mono text-sm"
              rows={8}
              value={config.body}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              placeholder={`{
  "received": true,
  "timestamp": "{{now}}",
  "method": "{{request.method}}",
  "body": {{request.body}}
}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use template variables: {'{'}{'{'} now {'}'}{'}'}, {'{'}{'{'} request.method {'}'}{'}'}, {'{'}{'{'} request.headers.x-custom {'}'}{'}'}, {'{'}{'{'} request.body {'}'}{'}'}, {'{'}{'{'} request.body.field {'}'}{'}'} 
            </p>
          </>
        ) : (
          <Textarea
            className="font-mono text-sm"
            rows={8}
            value={config.body}
            onChange={(e) => setConfig({ ...config, body: e.target.value })}
            placeholder='{"status": "ok"}'
          />
        )}
      </div>
      
      <Button onClick={() => saveResponseConfig(endpoint.id, config)}>
        Save Response Configuration
      </Button>
    </div>
  );
}
```

**Template Processing**:
```typescript
// utils/templateProcessor.ts
export function processResponseTemplate(template: string, request: Request): string {
  let processed = template;
  
  // Replace {{now}} with current ISO timestamp
  processed = processed.replace(/\{\{now\}\}/g, new Date().toISOString());
  
  // Replace {{request.method}}
  processed = processed.replace(/\{\{request\.method\}\}/g, request.method);
  
  // Replace {{request.headers.xxx}}
  const headerMatches = processed.match(/\{\{request\.headers\.([a-zA-Z0-9-]+)\}\}/g);
  if (headerMatches) {
    headerMatches.forEach((match) => {
      const headerName = match.match(/headers\.([a-zA-Z0-9-]+)/)?.[1];
      if (headerName) {
        const headerValue = request.headers[headerName] || '';
        processed = processed.replace(match, headerValue);
      }
    });
  }
  
  // Replace {{request.body}} with entire body
  processed = processed.replace(/\{\{request\.body\}\}/g, request.body);
  
  // Replace {{request.body.xxx}} with specific field
  const bodyFieldMatches = processed.match(/\{\{request\.body\.([a-zA-Z0-9_.]+)\}\}/g);
  if (bodyFieldMatches) {
    try {
      const bodyObj = JSON.parse(request.body);
      bodyFieldMatches.forEach((match) => {
        const fieldPath = match.match(/body\.([a-zA-Z0-9_.]+)/)?.[1];
        if (fieldPath) {
          const value = getNestedValue(bodyObj, fieldPath);
          processed = processed.replace(match, JSON.stringify(value));
        }
      });
    } catch {
      // Body is not JSON, skip
    }
  }
  
  return processed;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

---

# PHASE 4: AUTOMATION & CI/CD INTEGRATION

## 1. Programmable Endpoints with Scripts
**User Story**: As a developer, I want to write custom logic to process webhooks dynamically.

**Implementation**:
```typescript
// Database schema addition
ALTER TABLE endpoints ADD COLUMN script TEXT;
ALTER TABLE endpoints ADD COLUMN script_language VARCHAR(20) DEFAULT 'javascript';

// API endpoint for script execution
// app/api/endpoints/[id]/script/route.ts
import { VM } from 'vm2';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { script } = await req.json();
  
  // Validate and save script
  const endpoint = await db.endpoint.update({
    where: { id: params.id },
    data: { script, scriptLanguage: 'javascript' },
  });
  
  // Test script compilation
  try {
    const vm = new VM({ timeout: 1000, sandbox: {} });
    vm.run(script);
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}

// Script execution during webhook capture
async function executeEndpointScript(endpoint: Endpoint, request: IncomingRequest): Promise<ResponseOverride> {
  if (!endpoint.script) return null;
  
  const vm = new VM({
    timeout: 5000, // 5 second max execution
    sandbox: {
      request: {
        method: request.method,
        headers: request.headers,
        body: request.body,
        queryParams: request.queryParams,
      },
      response: {
        status: 200,
        headers: {},
        body: '',
      },
      console: {
        log: (...args: any[]) => console.log('[Script]', ...args),
      },
      // Utility functions
      JSON: JSON,
      atob: atob,
      btoa: btoa,
    },
  });
  
  try {
    const result = vm.run(endpoint.script);
    
    // Script should modify response object or return custom response
    return result || vm.sandbox.response;
  } catch (error) {
    console.error('Script execution error:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Script execution failed' }),
    };
  }
}
```

**Script Editor UI**:
```typescript
// components/ScriptEditor.tsx
import Editor from '@monaco-editor/react';

export function ScriptEditor({ endpoint }: { endpoint: Endpoint }) {
  const [script, setScript] = useState(endpoint.script || DEFAULT_SCRIPT);
  const [testRequest, setTestRequest] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  
  const DEFAULT_SCRIPT = `// Modify the response object
// Available: request.method, request.headers, request.body, request.queryParams

// Example: Echo request body
response.status = 200;
response.headers['Content-Type'] = 'application/json';
response.body = JSON.stringify({
  received: true,
  timestamp: new Date().toISOString(),
  data: JSON.parse(request.body)
});

// Example: Conditional response
if (request.headers['x-api-key'] !== 'secret') {
  response.status = 401;
  response.body = '{"error": "Unauthorized"}';
}`;
  
  const handleTest = async () => {
    const result = await fetch(`/api/endpoints/${endpoint.id}/script/test`, {
      method: 'POST',
      body: JSON.stringify({ script, testRequest }),
    });
    
    setTestResult(await result.json());
  };
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Script</Label>
        <Editor
          height="400px"
          defaultLanguage="javascript"
          value={script}
          onChange={(value) => setScript(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
          }}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={handleTest}>Test Script</Button>
          <Button onClick={() => saveScript(endpoint.id, script)}>Save Script</Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label>Test Request (JSON)</Label>
          <Textarea
            className="font-mono text-sm"
            rows={10}
            value={JSON.stringify(testRequest, null, 2)}
            onChange={(e) => setTestRequest(JSON.parse(e.target.value))}
          />
        </div>
        
        {testResult && (
          <div>
            <Label>Test Result</Label>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 2. Testing Scenarios Engine
**User Story**: As a QA engineer, I want to record and replay sequences of webhooks as automated tests.

**Database Schema**:
```sql
CREATE TABLE test_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  assertions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES test_scenarios(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- running, passed, failed
  results JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Implementation**:
```typescript
// types/testScenario.ts
interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
  assertions: Assertion[];
}

interface TestStep {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  delay?: number; // ms to wait before next step
}

interface Assertion {
  id: string;
  type: 'status' | 'header' | 'body' | 'json-path' | 'response-time';
  operator: 'equals' | 'contains' | 'matches' | 'less-than' | 'greater-than';
  expected: any;
  path?: string; // For JSON path assertions
}

// Scenario executor
export class ScenarioExecutor {
  async run(scenario: TestScenario): Promise<TestRunResult> {
    const results: StepResult[] = [];
    const startTime = Date.now();
    
    for (const step of scenario.steps) {
      const stepResult = await this.executeStep(step);
      results.push(stepResult);
      
      if (!stepResult.success) {
        return {
          status: 'failed',
          results,
          duration: Date.now() - startTime,
          failedStep: step.id,
        };
      }
      
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
    }
    
    // Run assertions
    const assertionResults = await this.runAssertions(scenario.assertions, results);
    
    return {
      status: assertionResults.every(a => a.passed) ? 'passed' : 'failed',
      results,
      assertionResults,
      duration: Date.now() - startTime,
    };
  }
  
  private async executeStep(step: TestStep): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(step.endpoint, {
        method: step.method,
        headers: step.headers,
        body: step.body,
      });
      
      const body = await response.text();
      
      return {
        stepId: step.id,
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
  
  private async runAssertions(assertions: Assertion[], results: StepResult[]): Promise<AssertionResult[]> {
    return assertions.map(assertion => {
      const lastResult = results[results.length - 1];
      
      switch (assertion.type) {
        case 'status':
          return {
            assertionId: assertion.id,
            passed: this.compare(lastResult.status, assertion.operator, assertion.expected),
            message: `Status ${lastResult.status} ${assertion.operator} ${assertion.expected}`,
          };
          
        case 'body':
          return {
            assertionId: assertion.id,
            passed: this.compare(lastResult.body, assertion.operator, assertion.expected),
            message: `Body ${assertion.operator} ${assertion.expected}`,
          };
          
        case 'json-path':
          const value = jsonPath.query(JSON.parse(lastResult.body), assertion.path)[0];
          return {
            assertionId: assertion.id,
            passed: this.compare(value, assertion.operator, assertion.expected),
            message: `${assertion.path} = ${value} ${assertion.operator} ${assertion.expected}`,
          };
          
        case 'response-time':
          return {
            assertionId: assertion.id,
            passed: this.compare(lastResult.duration, assertion.operator, assertion.expected),
            message: `Response time ${lastResult.duration}ms ${assertion.operator} ${assertion.expected}ms`,
          };
          
        default:
          return { assertionId: assertion.id, passed: false, message: 'Unknown assertion type' };
      }
    });
  }
  
  private compare(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'contains': return String(actual).includes(String(expected));
      case 'matches': return new RegExp(expected).test(String(actual));
      case 'less-than': return actual < expected;
      case 'greater-than': return actual > expected;
      default: return false;
    }
  }
}
```

**UI for Scenario Builder**:
```typescript
// components/ScenarioBuilder.tsx
export function ScenarioBuilder() {
  const [scenario, setScenario] = useState<TestScenario>({
    id: '',
    name: '',
    steps: [],
    assertions: [],
  });
  
  const addStep = () => {
    setScenario({
      ...scenario,
      steps: [
        ...scenario.steps,
        {
          id: generateId(),
          name: `Step ${scenario.steps.length + 1}`,
          endpoint: '',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '',
        },
      ],
    });
  };
  
  const addAssertion = () => {
    setScenario({
      ...scenario,
      assertions: [
        ...scenario.assertions,
        {
          id: generateId(),
          type: 'status',
          operator: 'equals',
          expected: 200,
        },
      ],
    });
  };
  
  const runScenario = async () => {
    const executor = new ScenarioExecutor();
    const result = await executor.run(scenario);
    
    // Display results
    toast.success(`Scenario ${result.status} in ${result.duration}ms`);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <Input
          placeholder="Scenario name"
          value={scenario.name}
          onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Steps</h3>
          <Button onClick={addStep} size="sm">Add Step</Button>
        </div>
        
        {scenario.steps.map((step, index) => (
          <StepEditor
            key={step.id}
            step={step}
            index={index}
            onChange={(updated) => {
              const newSteps = [...scenario.steps];
              newSteps[index] = updated;
              setScenario({ ...scenario, steps: newSteps });
            }}
          />
        ))}
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Assertions</h3>
          <Button onClick={addAssertion} size="sm">Add Assertion</Button>
        </div>
        
        {scenario.assertions.map((assertion, index) => (
          <AssertionEditor
            key={assertion.id}
            assertion={assertion}
            onChange={(updated) => {
              const newAssertions = [...scenario.assertions];
              newAssertions[index] = updated;
              setScenario({ ...scenario, assertions: newAssertions });
            }}
          />
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button onClick={runScenario}>Run Scenario</Button>
        <Button onClick={() => saveScenario(scenario)} variant="outline">Save</Button>
      </div>
    </div>
  );
}
```

---

## 3. CI/CD Integration
**User Story**: As a DevOps engineer, I want to run webhook tests in my CI/CD pipeline.

**GitHub Actions Integration**:
```yaml
# .github/workflows/webhook-tests.yml
name: Webhook Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Webhook CLI
        run: |
          npm install -g @your-platform/webhook-cli
          webhook-cli init --api-key ${{ secrets.WEBHOOK_API_KEY }}
      
      - name: Run Webhook Scenarios
        run: |
          webhook-cli scenarios run --scenario-id ${{ vars.SCENARIO_ID }} --fail-on-error
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: webhook-test-results
          path: webhook-results.json
```

**CLI Command for CI**:
```typescript
// cli/src/commands/scenarios.ts
program
  .command('scenarios run')
  .option('--scenario-id <id>', 'Scenario ID to run')
  .option('--fail-on-error', 'Exit with code 1 if tests fail')
  .action(async (options) => {
    const scenario = await fetchScenario(options.scenarioId);
    const executor = new ScenarioExecutor();
    const result = await executor.run(scenario);
    
    // Save results
    fs.writeFileSync('webhook-results.json', JSON.stringify(result, null, 2));
    
    // Print summary
    console.log(`\nScenario: ${scenario.name}`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Steps: ${result.results.length}`);
    console.log(`Assertions: ${result.assertionResults.filter(a => a.passed).length}/${result.assertionResults.length} passed`);
    
    if (options.failOnError && result.status === 'failed') {
      process.exit(1);
    }
  });
```

---

## Testing & Launch Checklist

### Phase 3
- [ ] CLI installs and authenticates correctly
- [ ] Real-time streaming works in terminal
- [ ] Tunnel forwards requests to localhost
- [ ] Templates apply correct configuration
- [ ] Custom responses render with variables
- [ ] QR codes generate and scan correctly

### Phase 4
- [ ] Scripts execute safely with timeout
- [ ] Scenario recorder captures steps
- [ ] Assertions validate correctly
- [ ] CI/CD integration runs tests
- [ ] API keys work for programmatic access
- [ ] Webhook chaining triggers correctly

---

## Performance Targets
- Script execution: < 5s timeout
- Scenario execution: < 30s for 10 steps
- CI/CD test run: < 2min
- Tunnel latency: < 100ms overhead

---

## Launch Criteria
- CLI published to npm
- Documentation for all features
- Example scenarios provided
- CI/CD templates available
- Security audit passed
