"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, UserPlus, History } from "lucide-react";
import { QUOTE_STATUS, type QuoteStatus } from "@/lib/status-colours";
import { QuoteTimeline } from "@/components/quotes/quote-timeline";
import { useState } from "react";

const ALL_STATUSES = Object.keys(QUOTE_STATUS) as QuoteStatus[];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface QuoteHeaderProps {
  quote: {
    id: string;
    quoteNumber: string;
    status: QuoteStatus;
    clientId: string | null;
    currency: string;
    createdAt: string;
    expiryDate: string | null;
    jobs?: { id: string; status: string }[];
  };
  quoteId: string;
  clients: { id: string; name: string; company: string | null }[];
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  onStatusChange: (status: string) => void;
  onCreateClient: (name: string, email: string) => Promise<void>;
  onNavigateJobs: () => void;
}

export function QuoteHeader({
  quote,
  quoteId,
  clients,
  selectedClientId,
  onClientChange,
  onStatusChange,
  onCreateClient,
  onNavigateJobs,
}: QuoteHeaderProps) {
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const jobCount = quote.jobs?.length ?? 0;

  const clientOptions = [
    { value: "", label: "-- No client --" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  async function handleQuickCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      await onCreateClient(newClientName.trim(), newClientEmail.trim());
      setShowNewClient(false);
      setNewClientName("");
      setNewClientEmail("");
    } catch {
      // Error handled by parent
    } finally {
      setCreatingClient(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Header + metadata */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-2xl">{quote.quoteNumber}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {jobCount > 0 && (
                <Badge
                  variant="info"
                  className="cursor-pointer"
                  onClick={onNavigateJobs}
                >
                  <Briefcase className="mr-1 h-3 w-3" />
                  {jobCount} job{jobCount !== 1 ? "s" : ""}
                </Badge>
              )}
              <Badge variant={QUOTE_STATUS[quote.status].variant}>
                {QUOTE_STATUS[quote.status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Client"
                options={clientOptions}
                value={selectedClientId}
                onChange={(e) => onClientChange(e.target.value)}
              />
              {!showNewClient ? (
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <UserPlus className="h-3 w-3" />
                  Create new client
                </button>
              ) : (
                <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">New Client</p>
                    <button
                      type="button"
                      onClick={() => { setShowNewClient(false); setNewClientName(""); setNewClientEmail(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client name *"
                  />
                  <Input
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="Email (optional)"
                    type="email"
                  />
                  <Button
                    size="sm"
                    onClick={handleQuickCreateClient}
                    disabled={creatingClient || !newClientName.trim()}
                  >
                    {creatingClient ? "Creating..." : "Create Client"}
                  </Button>
                </div>
              )}
            </div>
            <Select
              label="Status"
              value={quote.status}
              onChange={(e) => onStatusChange(e.target.value)}
              options={ALL_STATUSES.map((s) => ({
                value: s,
                label: QUOTE_STATUS[s].label,
              }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(quote.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expiry</p>
              <p className="font-medium">{formatDate(quote.expiryDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currency</p>
              <p className="font-medium">{quote.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Activity timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[260px] overflow-y-auto">
          <QuoteTimeline quoteId={quoteId} />
        </CardContent>
      </Card>
    </div>
  );
}
