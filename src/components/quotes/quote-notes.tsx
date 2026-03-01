"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check } from "lucide-react";

interface QuoteNotesProps {
  notes: string;
  terms: string;
  onSave: (notes: string, terms: string) => Promise<void>;
}

export function QuoteNotes({ notes: initialNotes, terms: initialTerms, onSave }: QuoteNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [terms, setTerms] = useState(initialTerms);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialised = useRef(false);

  // Sync from parent when quote reloads
  useEffect(() => {
    setNotes(initialNotes);
    setTerms(initialTerms);
    initialised.current = true;
  }, [initialNotes, initialTerms]);

  const debouncedSave = useCallback(
    (newNotes: string, newTerms: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          await onSave(newNotes, newTerms);
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        } catch {
          setSaveState("idle");
        }
      }, 800);
    },
    [onSave]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    if (initialised.current) debouncedSave(value, terms);
  }

  function handleTermsChange(value: string) {
    setTerms(value);
    if (initialised.current) debouncedSave(notes, value);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notes & Terms</CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-primary" />
                Saved
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Internal notes about this quote..."
          />
          <Textarea
            label="Terms & Conditions"
            value={terms}
            onChange={(e) => handleTermsChange(e.target.value)}
            placeholder="Terms and conditions for this quote..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
