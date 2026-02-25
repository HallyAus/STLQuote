"use client";

import * as React from "react";
import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Colour palette — 8 muted colours that work in both light and dark mode.
// We pick one deterministically from a hash of the tag text.
// ---------------------------------------------------------------------------

const TAG_COLOURS = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
] as const;

function hashTag(tag: string): number {
  let hash = 0;
  const lower = tag.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

function tagColourClass(tag: string): string {
  return TAG_COLOURS[hashTag(tag) % TAG_COLOURS.length];
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  id?: string;
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder = "Add a tag...",
  suggestions = [],
  className,
  id,
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  // Filtered suggestions: match typed text and exclude already-selected tags
  const filteredSuggestions = suggestions.filter((s) => {
    const alreadySelected = value.some(
      (v) => v.toLowerCase() === s.toLowerCase()
    );
    if (alreadySelected) return false;
    if (!inputValue.trim()) return true; // Show all remaining when empty
    return s.toLowerCase().includes(inputValue.toLowerCase());
  });

  // Add a tag (deduplicated, trimmed)
  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim();
      if (!tag) return;
      const duplicate = value.some(
        (v) => v.toLowerCase() === tag.toLowerCase()
      );
      if (duplicate) {
        setInputValue("");
        return;
      }
      onChange([...value, tag]);
      setInputValue("");
      setHighlightedIndex(-1);
    },
    [value, onChange]
  );

  // Remove a tag by index
  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted suggestion into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter or comma adds the current value (or highlighted suggestion)
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (
        showSuggestions &&
        highlightedIndex >= 0 &&
        highlightedIndex < filteredSuggestions.length
      ) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(inputValue);
      }
      return;
    }

    // Backspace on empty input removes the last tag
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value.length - 1);
      return;
    }

    // Arrow keys for suggestion navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions && filteredSuggestions.length > 0) {
        setShowSuggestions(true);
      }
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
      return;
    }

    // Escape closes suggestions
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // If the user pasted something with commas, split and add each
    if (val.includes(",")) {
      const parts = val.split(",");
      // Add all parts except the last (which may be partial)
      for (let i = 0; i < parts.length - 1; i++) {
        addTag(parts[i]);
      }
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(val);
    }
    setHighlightedIndex(-1);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      {/* Tag container + input */}
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm transition-colors",
          "focus-within:ring-1 focus-within:ring-ring"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Rendered tags */}
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              tagColourClass(tag)
            )}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors hover:bg-foreground/10"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={showSuggestions && filteredSuggestions.length > 0}
          aria-controls={inputId ? `${inputId}-listbox` : undefined}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${inputId}-option-${highlightedIndex}`
              : undefined
          }
          autoComplete="off"
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          ref={listboxRef}
          id={inputId ? `${inputId}-listbox` : undefined}
          role="listbox"
          className="z-50 max-h-48 overflow-auto rounded-md border border-input bg-background p-1 shadow-md"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={inputId ? `${inputId}-option-${index}` : undefined}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors",
                index === highlightedIndex
                  ? "bg-muted"
                  : "hover:bg-muted/50"
              )}
              onMouseDown={(e) => {
                // Prevent blur on the input before we can add the tag
                e.preventDefault();
                addTag(suggestion);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span
                className={cn(
                  "mr-2 inline-block h-2 w-2 rounded-full",
                  tagColourClass(suggestion).split(" ")[0].replace("/15", "/50")
                )}
              />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
