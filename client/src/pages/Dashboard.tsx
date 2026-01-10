import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useWebhook, useWebhookRequests } from "@/hooks/use-webhooks";
import { useSocket } from "@/hooks/use-socket";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequestDetail } from "@/components/request/RequestDetail";
import { Loader2, AlertCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Dashboard() {
  const [match, params] = useRoute("/:id");
  const webhookId = params?.id;

  const { data: webhook, isLoading: loadingWebhook, error: webhookError } = useWebhook(webhookId || "");
  const { data: requests, isLoading: loadingRequests } = useWebhookRequests(webhookId || "");
  const { connected } = useSocket(webhookId);
  
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-select first request when data loads if nothing selected
  useEffect(() => {
    if (requests && requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  if (loadingWebhook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (webhookError || !webhook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold font-display mb-2">Webhook Not Found</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">
          The webhook session you are looking for might have expired or does not exist.
        </p>
        <Button onClick={() => window.location.href = "/"}>
          Create New Session
        </Button>
      </div>
    );
  }

  const selectedRequest = requests?.find(r => r.id === selectedRequestId);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      <Header webhook={webhook} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full">
          <Sidebar 
            requests={requests || []} 
            selectedId={selectedRequestId}
            onSelect={setSelectedRequestId}
            className="h-full w-full"
          />
        </div>

        {/* Mobile Sidebar Trigger */}
        <div className="md:hidden absolute bottom-6 left-6 z-50">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="rounded-full w-12 h-12 shadow-2xl">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <Sidebar 
                requests={requests || []} 
                selectedId={selectedRequestId}
                onSelect={(id) => {
                  setSelectedRequestId(id);
                  setIsMobileMenuOpen(false);
                }}
                className="h-full border-none"
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content */}
        <main className="flex-1 h-full bg-background relative overflow-hidden">
          <RequestDetail request={selectedRequest} />
          
          {/* Connection Status Indicator */}
          <div className="absolute bottom-4 right-4 z-20">
            <div className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-mono font-medium border flex items-center gap-1.5 transition-all shadow-lg",
              connected 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-red-500")} />
              {connected ? "Socket Connected" : "Reconnecting..."}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
