import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import { useEffect } from "react";
import { posthog } from "./lib/posthog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/:id" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Test PostHog
    console.log('PostHog instance:', posthog);
    console.log('PostHog __loaded:', posthog.__loaded);
    if (posthog.__loaded) {
      posthog.capture('app_loaded', { test: true });
      console.log('PostHog test event captured');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
