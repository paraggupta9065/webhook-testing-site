import { useState } from "react";
import { type Webhook } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ResponseConfigProps {
  webhook: Webhook;
  onUpdate: (config: { responseStatus: string | number; responseHeaders: Record<string, string>; responseBody: string }) => void;
  isUpdating?: boolean;
}

export function ResponseConfig({ webhook, onUpdate, isUpdating }: ResponseConfigProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(webhook.responseStatus || "200");
  const [headers, setHeaders] = useState(
    webhook.responseHeaders 
      ? JSON.stringify(webhook.responseHeaders, null, 2) 
      : '{\n  "Content-Type": "application/json"\n}'
  );
  const [body, setBody] = useState(webhook.responseBody || "OK");

  const handleSave = () => {
    try {
      const parsedHeaders = headers.trim() ? JSON.parse(headers) : {};
      onUpdate({
        responseStatus: status,
        responseHeaders: parsedHeaders,
        responseBody: body,
      });
      setOpen(false);
    } catch (error) {
      alert("Invalid JSON in headers. Please fix and try again.");
    }
  };

  const handleReset = () => {
    setStatus(webhook.responseStatus || "200");
    setHeaders(
      webhook.responseHeaders 
        ? JSON.stringify(webhook.responseHeaders, null, 2) 
        : '{\n  "Content-Type": "application/json"\n}'
    );
    setBody(webhook.responseBody || "OK");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border border-border">
          <Settings className="w-4 h-4" />
          Response Config
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure Webhook Response</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Response Settings</CardTitle>
              <CardDescription>
                Customize the response that will be sent back when this webhook receives a request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Code */}
              <div className="space-y-2">
                <Label htmlFor="status">Status Code</Label>
                <Input
                  id="status"
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="200"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  HTTP status code (e.g., 200, 201, 400, 500)
                </p>
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <Label htmlFor="headers">Response Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"Content-Type": "application/json"}'
                  className="font-mono text-xs min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Custom headers as JSON object
                </p>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Response Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="OK"
                  className="font-mono text-xs min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground">
                  Response body content (can be plain text or JSON)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isUpdating}
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
