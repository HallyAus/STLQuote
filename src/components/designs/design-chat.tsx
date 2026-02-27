"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, ImagePlus, Loader2, Sparkles, X } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  imageData: string | null;
  metadata: string | null;
  createdAt: string;
}

const STARTER_PROMPTS = [
  "What material would work best for an outdoor product?",
  "Help me brainstorm a mount design for my workshop",
  "What print orientation should I use to maximise strength?",
  "Suggest ways to reduce print time without sacrificing quality",
];

export function DesignChat({ designId, initialMessages }: { designId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg && !imageData) return;
    setSending(true);
    setInput("");

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: Message = { id: tempId, role: "user", content: msg, imageData, metadata: null, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    const sentImageData = imageData;
    setImageData(null);

    try {
      const res = await fetch(`/api/designs/${designId}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, imageData: sentImageData }),
      });
      if (res.ok) {
        const assistantMsg = await res.json();
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to send" }));
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: `Error: ${err.error}`, imageData: null, metadata: null, createdAt: new Date().toISOString() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "Failed to connect. Please try again.", imageData: null, metadata: null, createdAt: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">AI Brainstorm</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-md">
              Chat with AI about your design. Attach images for visual analysis.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-lg w-full">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-border p-3 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.imageData && (
                  <img src={msg.imageData} alt="Attached" className="mb-2 max-h-48 rounded" />
                )}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className={cn("mt-1 text-[10px]", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Image preview */}
      {imageData && (
        <div className="px-4 py-2 border-t border-border">
          <div className="relative inline-block">
            <img src={imageData} alt="Preview" className="h-16 rounded" />
            <button onClick={() => setImageData(null)} className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="shrink-0"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your design..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button size="sm" onClick={() => sendMessage()} disabled={sending || (!input.trim() && !imageData)} className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
