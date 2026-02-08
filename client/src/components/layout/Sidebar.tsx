import { cn } from "@/lib/utils";
import { type WebhookRequest } from "@shared/schema";
import { format } from "date-fns";
import { Search, Inbox, Activity, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  requests: WebhookRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearHistory?: () => void;
  className?: string;
}

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    POST: "text-green-400 bg-green-400/10 border-green-400/20",
    PUT: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    DELETE: "text-red-400 bg-red-400/10 border-red-400/20",
    PATCH: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  };

  const defaultColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";

  return (
    <span className={cn(
      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
      colors[method] || defaultColor
    )}>
      {method}
    </span>
  );
};

export function Sidebar({ requests, selectedId, onSelect, onClearHistory, className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col h-full bg-secondary/30 border-r border-border", className)}>
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Request History
          </h2>
          {requests.length > 0 && onClearHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Filter requests..." 
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <Activity className="w-8 h-8 mb-2 opacity-20" />
            <p>Waiting for requests...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {requests.map((req) => (
              <motion.button
                key={req.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => onSelect(req.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden",
                  selectedId === req.id
                    ? "bg-card border-primary/20 shadow-sm"
                    : "border-transparent hover:bg-secondary/50"
                )}
              >
                {selectedId === req.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                
                <div className="flex items-center justify-between mb-2">
                  <MethodBadge method={req.method} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {format(new Date(req.timestamp || Date.now()), "HH:mm:ss")}
                  </span>
                </div>
                
                <div className={cn(
                  "font-mono text-xs truncate",
                  selectedId === req.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {req.path}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
      
      <div className="p-3 border-t border-border/50 text-xs text-center text-muted-foreground bg-secondary/10">
        {requests.length} Requests Captured
      </div>
    </div>
  );
}
