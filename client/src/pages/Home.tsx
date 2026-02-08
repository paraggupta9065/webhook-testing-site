import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateWebhook } from "@/hooks/use-webhooks";
import { Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { mutate, isPending } = useCreateWebhook();

  useEffect(() => {
    // Debug environment variables
    console.log('Environment check:', {
      VITE_PUBLIC_POSTHOG_KEY: import.meta.env.VITE_PUBLIC_POSTHOG_KEY,
      VITE_PUBLIC_POSTHOG_HOST: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      allEnv: import.meta.env
    });

    // Automatically create a webhook session on load
    mutate(undefined, {
      onSuccess: (webhook) => {
        setLocation(`/${webhook.id}`);
      },
    });
  }, [mutate, setLocation]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center max-w-md text-center space-y-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap className="w-8 h-8 text-white fill-white" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white">
            test-webhook.com
          </h1>
          <p className="text-muted-foreground text-lg">
            Powerful webhook testing and tunneling for developers. Hosted at <span className="underline">test-webhook.com</span>.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-primary font-mono bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Initializing Session...</span>
              </>
            ) : (
              <span className="text-sm">Redirecting to Dashboard...</span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground/60 mt-4 max-w-xs">
            No sign-up required. Sessions expire automatically after 24 hours of inactivity.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
