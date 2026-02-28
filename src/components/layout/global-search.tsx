"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Briefcase, Loader2, Receipt, PenTool } from "lucide-react";

interface SearchResults {
  quotes: {
    id: string;
    quoteNumber: string;
    status: string;
    total: number;
    client: { name: string } | null;
  }[];
  clients: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  }[];
  jobs: {
    id: string;
    status: string;
    quote: { quoteNumber: string } | null;
    printer: { name: string } | null;
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    client: { name: string } | null;
  }[];
  drawings: {
    id: string;
    drawingNumber: string;
    title: string;
    sourceFilename: string;
  }[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  const hasResults =
    results &&
    (results.quotes.length > 0 || results.clients.length > 0 || results.jobs.length > 0 || results.invoices.length > 0 || results.drawings.length > 0);

  return (
    <div className="relative hidden sm:block" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:w-64"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg">
          {!hasResults ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {results.quotes.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Quotes
                  </p>
                  {results.quotes.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => navigate(`/quotes/${q.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium">{q.quoteNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {q.client?.name ?? "No client"} — ${q.total.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.clients.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Clients
                  </p>
                  {results.clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.company || c.email || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.jobs.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Jobs
                  </p>
                  {results.jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => navigate("/jobs")}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium">
                          {j.quote?.quoteNumber ?? "Unlinked job"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {j.printer?.name ?? "No printer"} — {j.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.invoices.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Invoices
                  </p>
                  {results.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Receipt className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {inv.client?.name ?? "No client"} — ${inv.total.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.drawings.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Drawings
                  </p>
                  {results.drawings.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/drawings/${d.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <PenTool className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium">{d.drawingNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.title} — {d.sourceFilename}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
