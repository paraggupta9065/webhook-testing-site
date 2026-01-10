import { type WebhookRequest } from "@shared/schema";
import { format } from "date-fns";
import { Code, Copy, Globe, Clock, Hash, FileJson } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RequestDetailProps {
  request: WebhookRequest | undefined;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-1.5 hover:bg-white/10 rounded transition-colors"
      title="Copy to clipboard"
    >
      <Copy className={cn("w-3.5 h-3.5", copied ? "text-green-400" : "text-muted-foreground")} />
    </button>
  );
}

function Section({ title, icon: Icon, children, className }: { title: string, icon: any, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("border border-border rounded-xl overflow-hidden bg-card/30", className)}>
      <div className="bg-secondary/30 px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="w-4 h-4" />
          {title}
        </div>
      </div>
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}

function KeyValueList({ data }: { data: Record<string, any> }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="p-4 text-sm text-muted-foreground italic">Empty</div>;
  }

  return (
    <div className="divide-y divide-border/40">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex group hover:bg-white/[0.02] transition-colors">
          <div className="w-1/3 min-w-[150px] p-3 text-xs font-mono text-muted-foreground border-r border-border/40 truncate">
            {key}
          </div>
          <div className="flex-1 p-3 text-xs font-mono text-foreground break-all flex items-start justify-between">
            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={String(value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RequestDetail({ request }: RequestDetailProps) {
  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Request Selected</h3>
        <p className="text-sm max-w-xs">Select a request from the sidebar to view its details, headers, and body payload.</p>
      </div>
    );
  }

  const methodColors: Record<string, string> = {
    GET: "text-blue-400",
    POST: "text-green-400",
    PUT: "text-orange-400",
    DELETE: "text-red-400",
    PATCH: "text-yellow-400",
  };

  const formattedDate = format(new Date(request.timestamp), "MMM d, yyyy HH:mm:ss");

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-3">
              <span className={methodColors[request.method] || "text-foreground"}>{request.method}</span>
              <span className="text-foreground">{request.path}</span>
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                ID: {request.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Params */}
        <Section title="Query Parameters" icon={Globe} className={!request.query || Object.keys(request.query as object).length === 0 ? "opacity-60" : ""}>
          <KeyValueList data={request.query as Record<string, any>} />
        </Section>

        {/* Headers */}
        <Section title="Headers" icon={Code}>
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
            <KeyValueList data={request.headers as Record<string, any>} />
          </div>
        </Section>
      </div>

      {/* Body Payload */}
      <Section title="Request Body" icon={FileJson} className="min-h-[300px] flex flex-col">
        {request.body && Object.keys(request.body as object).length > 0 ? (
          <div className="relative group flex-1">
            <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={JSON.stringify(request.body, null, 2)} />
            </div>
            <SyntaxHighlighter 
              language="json" 
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                background: 'transparent',
                height: '100%'
              }}
            >
              {JSON.stringify(request.body, null, 2)}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm italic">
            No body content
          </div>
        )}
      </Section>
    </div>
  );
}
