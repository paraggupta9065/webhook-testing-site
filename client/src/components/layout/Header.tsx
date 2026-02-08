import { Webhook } from "@shared/schema";
import { Terminal, Copy, Share2, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ResponseConfig } from "@/components/webhook/ResponseConfig";
import { useUpdateWebhookResponse } from "@/hooks/use-webhooks";

interface HeaderProps {
  webhook: Webhook;
}

export function Header({ webhook }: HeaderProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const { mutate: updateResponse, isPending } = useUpdateWebhookResponse();

  const webhookUrl = `${window.location.origin}/webhook/${webhook.uniqueSlug}`;
  const cliCommand = `npx test-webhook-cli ${webhook.id} 3000`;

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleUpdateResponse = (config: { responseStatus: string | number; responseHeaders: Record<string, string>; responseBody: string }) => {
    updateResponse({ webhookId: webhook.id, config: { ...config, responseStatus: String(config.responseStatus) } });
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur px-6 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-none tracking-tight">test-webhook.com</h1>
          <div className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Tunnel Active
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Webhook URL Input Group */}
        <div className="flex items-center bg-secondary/50 rounded-lg border border-border overflow-hidden">
          <div className="hidden sm:block px-3 py-1.5 text-xs text-muted-foreground border-r border-border font-medium">
            URL
          </div>
          <div className="px-3 py-1.5 text-[10px] md:text-xs font-mono text-foreground max-w-[120px] md:max-w-[200px] truncate">
            {webhookUrl}
          </div>
          <button
            onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
            className="px-3 py-2 hover:bg-white/5 transition-colors border-l border-border"
            title="Copy URL"
          >
            <Copy className={cn("w-3.5 h-3.5", copiedUrl ? "text-green-400" : "text-muted-foreground")} />
          </button>
        </div>

        {/* CLI Command Input Group */}
        {/* <div className="hidden sm:flex items-center bg-secondary/50 rounded-lg border border-border overflow-hidden group">
          <div className="hidden lg:block px-3 py-1.5 text-xs text-muted-foreground border-r border-border font-medium bg-secondary/80">
            Tunnel
          </div>
          <div className="px-3 py-1.5 text-[10px] md:text-xs font-mono text-primary max-w-[150px] md:max-w-[250px] truncate select-all">
            {cliCommand}
          </div>
          <button
            onClick={() => copyToClipboard(cliCommand, setCopiedCli)}
            className="px-3 py-2 hover:bg-white/5 transition-colors border-l border-border"
            title="Copy CLI Command"
          >
            <Copy className={cn("w-3.5 h-3.5", copiedCli ? "text-green-400" : "text-muted-foreground")} />
          </button>
        </div> */}

        <ResponseConfig 
          webhook={webhook} 
          onUpdate={handleUpdateResponse}
          isUpdating={isPending}
        />

        <Button variant="outline" size="icon" className="hidden xs:flex rounded-full border border-border bg-secondary/30 hover:bg-secondary/80">
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
