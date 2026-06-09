"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatBar } from "@/components/AIChatBar";
import { useTherapistChat } from "@/hooks/useTherapistChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSettings } from "@/hooks/useSettings";
import type { Entry } from "@/hooks/useEntries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DAYS_PL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(iso);
  const dayName = DAYS_PL[date.getDay()];
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} ${MONTHS_PL[month - 1]} ${year}`;
}

function FreudAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-stone-700 text-stone-100 flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
      ZF
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <FreudAvatar />
      <div className="bg-card ring-1 ring-foreground/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[78%]">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

interface TherapistChatPanelProps {
  entry: Entry;
  allEntries: Entry[];
  onDelete: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  /** Desktop: renders without fixed bottom bar */
  inline?: boolean;
}

export function TherapistChatPanel({
  entry,
  allEntries,
  onDelete,
  onBack,
  showBackButton,
  inline = false,
}: TherapistChatPanelProps) {
  const { settings } = useSettings();
  const { messages, sendMessage, isStreaming, streamingText } = useTherapistChat(entry, allEntries, settings);
  const [barValue, setBarValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { activeField, isTranscribing, toggleListening } = useSpeechRecognition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecording = activeField === "reflection";

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function handleSend(text: string) {
    setIsSending(true);
    try {
      await sendMessage(text);
    } finally {
      setIsSending(false);
    }
  }

  function handleMic() {
    toggleListening("reflection", (transcript) => {
      setBarValue((prev) => prev ? `${prev} ${transcript}` : transcript);
    });
  }

  const chatContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-10 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {showBackButton && onBack ? (
            <button type="button" onClick={onBack}
              className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors mr-1"
              aria-label="Wróć">←</button>
          ) : null}
          <FreudAvatar />
          <div>
            <p className="text-sm font-semibold leading-none">Zygmunt Freud</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.date)}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowConfirm(true)} aria-label="Usuń sesję"
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 lg:px-8 py-2 ${inline ? "" : "pb-36"}`}>
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <FreudAvatar />
            <p className="text-sm text-muted-foreground max-w-xs">
              Zacznij pisać lub nagraj wiadomość głosową.<br />Freud odpowie i poprowadzi sesję.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          msg.role === "user" ? (
            <div key={i} className="flex justify-end mb-3">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[78%] text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2 mb-3">
              <FreudAvatar />
              <div className="bg-card ring-1 ring-foreground/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[78%] text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          )
        ))}

        {/* Streaming Freud response */}
        {isStreaming && streamingText && (
          <div className="flex items-end gap-2 mb-3">
            <FreudAvatar />
            <div className="bg-card ring-1 ring-foreground/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[78%] text-sm leading-relaxed whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 bg-foreground/40 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
            </div>
          </div>
        )}

        {/* Typing indicator (waiting for first token) */}
        {isStreaming && !streamingText && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );

  const chatBar = (
    <div className={`${inline ? "px-6 lg:px-8 py-4 border-t border-border/50 bg-background/80 backdrop-blur-sm" : "fixed bottom-0 inset-x-0 px-4 pt-2 bg-background/80 backdrop-blur-sm border-t border-border/40"}`}
      style={inline ? undefined : { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <AIChatBar
        value={barValue}
        onChange={setBarValue}
        onSend={handleSend}
        isTranscribing={isTranscribing}
        isSending={isSending || isStreaming}
        actionButton={
          <Button
            size="icon"
            className={`w-12 h-12 rounded-full shadow-lg flex-shrink-0 ${
              isRecording ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30" : "shadow-primary/30"
            }`}
            onClick={handleMic}
            aria-label={isRecording ? "Zatrzymaj nagrywanie" : "Nagraj głosowo"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>
        }
      />
    </div>
  );

  return (
    <>
      {inline ? (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {chatContent}
          {chatBar}
        </div>
      ) : (
        <div className="flex flex-col min-h-dvh max-w-2xl mx-auto w-full">
          {chatContent}
          {chatBar}
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń sesję</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć tę sesję terapeutyczną? Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={() => { setShowConfirm(false); onDelete(); }}>Usuń</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
