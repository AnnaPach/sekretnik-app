"use client";

import { useRef } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIChatBarProps {
  className?: string;
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => Promise<void>;
  actionButton?: React.ReactNode;
  isTranscribing?: boolean;
  isSending?: boolean;
}

export function AIChatBar({
  className,
  value,
  onChange,
  onSend,
  actionButton,
  isTranscribing,
  isSending,
}: AIChatBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 88) + "px";
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    onChange(e.currentTarget.value);
    resize();
  }

  async function handleSend() {
    const text = value.trim();
    if (!text || isSending || isTranscribing) return;
    await onSend(text);
    onChange("");
    if (textareaRef.current) textareaRef.current.style.height = "24px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = value.trim().length > 0 && !isSending && !isTranscribing;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-1">
        Porozmawiajmy
      </span>
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-1 bg-card rounded-2xl ring-1 ring-foreground/10 shadow-md px-3 py-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            placeholder={isTranscribing ? "Transkrybuję…" : "Napisz lub powiedz coś…"}
            className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60"
            style={{ height: "24px" }}
            onInput={handleInput}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTranscribing}
          />
          <button
            type="button"
            aria-label="Wyślij"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canSend
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground opacity-40 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>
        {actionButton}
      </div>
    </div>
  );
}
