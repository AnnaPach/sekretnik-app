"use client";

import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import { useRouter } from "next/navigation";
import { useEntries } from "@/hooks/useEntries";
import { MoodPicker } from "@/components/MoodPicker";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { useSpeechRecognition, type FieldId } from "@/hooks/useSpeechRecognition";

const DAYS_PL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(iso);
  return `${DAYS_PL[date.getDay()]}, ${day} ${MONTHS_PL[month - 1]} ${year}`;
}

/** Auto-resizes a textarea to fit its content (no scrollbar). */
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function useAutoResizeRef(): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (ref.current) autoResize(ref.current);
  });
  return ref;
}

const TEXTAREA_CLASS =
  "flex-1 bg-transparent border-none outline-none resize-none overflow-hidden text-sm leading-relaxed text-foreground placeholder:text-border";

function appendText(current: string, appended: string): string {
  const trimmed = appended.trim();
  if (!trimmed) return current;
  return current ? current + " " + trimmed : trimmed;
}

function MicButton({
  fieldId,
  isActive,
  isSupported,
  isTranscribing,
  onToggle,
}: {
  fieldId: FieldId;
  isActive: boolean;
  isSupported: boolean;
  isTranscribing: boolean;
  onToggle: () => void;
}) {
  if (!isSupported) return null;
  const busy = isActive || isTranscribing;
  return (
    <div className={`relative shrink-0 ${busy ? "inline-flex" : "hidden group-focus-within:inline-flex"}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={isTranscribing}
        aria-label={isActive ? "Zatrzymaj nagrywanie" : isTranscribing ? "Transkrybowanie…" : "Nagraj głosowo"}
        aria-pressed={isActive}
        className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
          busy
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        {isTranscribing
          ? <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          : <Mic size={16} aria-hidden="true" />
        }
      </button>
      {isActive && !isTranscribing && (
        <span
          aria-hidden="true"
          className="animate-pulse bg-destructive rounded-sm w-2 h-2 absolute -top-0.5 -right-0.5"
        />
      )}
    </div>
  );
}

type NewEntryData = {
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
};

interface EntryEditorFormProps {
  id?: string;
  initialData?: NewEntryData;
  onSave?: (data: NewEntryData) => Promise<void>;
  onCancel?: () => void;
}

export function EntryEditorForm({ id, initialData, onSave, onCancel }: EntryEditorFormProps) {
  const router = useRouter();
  const { addEntry, updateEntry, updateReflection, getEntry, loaded } = useEntries();
  const { isSupported, activeField, isTranscribing, toggleListening } = useSpeechRecognition();

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [moments, setMoments] = useState<[string, string, string]>(initialData?.moments ?? ["", "", ""]);
  const [gratitude, setGratitude] = useState(initialData?.gratitude ?? "");
  const [learned, setLearned] = useState(initialData?.learned ?? "");
  const [quote, setQuote] = useState(initialData?.quote ?? "");
  const [mood, setMood] = useState(initialData?.mood ?? 3);
  const [dirty, setDirty] = useState(false);
  const [isReflection, setIsReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  // Refs for the 3 moment textareas (for focus navigation and auto-resize)
  const momentRefs = [
    useRef<HTMLTextAreaElement | null>(null),
    useRef<HTMLTextAreaElement | null>(null),
    useRef<HTMLTextAreaElement | null>(null),
  ] as const;
  const gratitudeRef = useAutoResizeRef();
  const learnedRef = useAutoResizeRef();
  const quoteRef = useAutoResizeRef();

  // Auto-resize moment textareas whenever their values change
  useEffect(() => {
    momentRefs.forEach((r) => { if (r.current) autoResize(r.current); });
  });

  useEffect(() => {
    if (id && loaded && !initialData) {
      const entry = getEntry(id);
      if (!entry) { router.replace("/"); return; }
      if (entry.type === "reflection") {
        setIsReflection(true);
        setReflectionText(entry.reflection ?? "");
        return;
      }
      setTitle(entry.title);
      setMoments(entry.moments ?? ["", "", ""]);
      setGratitude(entry.gratitude ?? "");
      setLearned(entry.learned ?? "");
      setQuote(entry.quote ?? "");
      setMood(entry.mood);
    }
  }, [id, loaded]);

  const handleMoment = useCallback((index: number, value: string) => {
    setMoments((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
    setDirty(true);
  }, []);

  /** On Enter in a moment field, jump to the next field (or gratitude). */
  function handleMomentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = index < 2 ? momentRefs[index + 1].current : gratitudeRef.current;
      next?.focus();
    }
  }

  async function handleSave() {
    if (isReflection) {
      if (!reflectionText.trim() || !id) return;
      await updateReflection(id, reflectionText);
      router.push(`/${id}`);
      return;
    }
    if (!canSave) return;
    const data = { title: title.trim(), moments, gratitude, learned, quote, mood };
    if (onSave) {
      await onSave(data);
    } else if (id) {
      await updateEntry(id, data);
      router.push(`/${id}`);
    } else {
      await addEntry(data);
      router.push("/");
    }
  }

  function handleCancel() {
    if (dirty && !window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz wyjść?")) return;
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  const hasContent = moments.some((m) => m.trim()) || gratitude.trim() || learned.trim();
  const canSave = title.trim().length > 0 && hasContent;

  const isInline = !!(onSave || onCancel);

  if (isReflection) {
    return (
      <div className="flex flex-col min-h-dvh max-w-2xl mx-auto w-full px-4">
        <header className="flex items-center justify-between py-5 gap-3">
          <button type="button" onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
            aria-label="Wróć">←</button>
          <Button type="button" onClick={handleSave} disabled={!reflectionText.trim()} size="sm">
            Zapisz
          </Button>
        </header>
        <main className="flex flex-col flex-1 pb-10">
          <span className="text-4xl mb-5">💬</span>
          <textarea
            className="flex-1 w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 min-h-[200px]"
            value={reflectionText}
            onChange={(e) => { setReflectionText(e.target.value); setDirty(true); }}
            placeholder="Napisz swoje przemyślenia…"
            autoFocus
          />
        </main>
      </div>
    );
  }

  return (
    <div className={isInline ? "flex flex-col w-full px-4" : "flex flex-col min-h-dvh max-w-2xl mx-auto w-full px-4"}>
      <header className="flex items-center justify-between py-5 gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
          aria-label="Wróć"
        >
          ←
        </button>
        <span className="text-sm text-muted-foreground flex-1 text-center">
          {formatDate(today)}
        </span>
        <Button type="button" onClick={handleSave} disabled={!canSave} size="sm">
          Zapisz
        </Button>
      </header>

      <main className="flex flex-col gap-4 pb-10 flex-1">
        {/* Tytuł */}
        <div className="group flex items-center gap-2">
          <input
            className="font-serif text-2xl font-bold bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-border"
            placeholder="Tytuł wpisu…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            maxLength={120}
            autoFocus
          />
          <MicButton
            fieldId="title"
            isActive={activeField === "title"}
            isSupported={isSupported}
            isTranscribing={isTranscribing}
            onToggle={() =>
              toggleListening("title", (text) => {
                setTitle((prev) => appendText(prev, text).slice(0, 120));
                setDirty(true);
              })
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Nastrój
          </label>
          <MoodPicker value={mood} onChange={(v) => { setMood(v); setDirty(true); }} />
        </div>

        {/* Sekcja 1 — Momenty */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Najmilsze momenty tego dnia
          </span>
          {([0, 1, 2] as const).map((i) => (
            <div key={i} className="group flex items-start gap-3">
              <span className="text-sm font-semibold text-muted-foreground pt-1 min-w-[14px]">{i + 1}</span>
              <textarea
                ref={momentRefs[i]}
                className={TEXTAREA_CLASS}
                value={moments[i]}
                onChange={(e) => handleMoment(i, e.target.value)}
                onKeyDown={(e) => handleMomentKeyDown(e, i)}
                placeholder="…"
                rows={1}
              />
              <MicButton
                fieldId={`moments-${i}` as FieldId}
                isActive={activeField === `moments-${i}`}
                isSupported={isSupported}
                isTranscribing={isTranscribing}
                onToggle={() =>
                  toggleListening(`moments-${i}` as FieldId, (text) =>
                    handleMoment(i, appendText(moments[i], text))
                  )
                }
              />
            </div>
          ))}
        </div>

        {/* Sekcja 2 — Wdzięczność */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Dzisiaj jestem wdzięczna/y za
          </span>
          <div className="group flex items-start gap-2">
            <textarea
              ref={gratitudeRef}
              className={TEXTAREA_CLASS}
              value={gratitude}
              onChange={(e) => { setGratitude(e.target.value); setDirty(true); }}
              placeholder="…"
              rows={1}
            />
            <MicButton
              fieldId="gratitude"
              isActive={activeField === "gratitude"}
              isSupported={isSupported}
              isTranscribing={isTranscribing}
              onToggle={() =>
                toggleListening("gratitude", (text) => {
                  setGratitude((prev) => appendText(prev, text));
                  setDirty(true);
                })
              }
            />
          </div>
        </div>

        {/* Sekcja 3 — Nauka */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Dziś nauczyłam/em się
          </span>
          <div className="group flex items-start gap-2">
            <textarea
              ref={learnedRef}
              className={TEXTAREA_CLASS}
              value={learned}
              onChange={(e) => { setLearned(e.target.value); setDirty(true); }}
              placeholder="…"
              rows={1}
            />
            <MicButton
              fieldId="learned"
              isActive={activeField === "learned"}
              isSupported={isSupported}
              isTranscribing={isTranscribing}
              onToggle={() =>
                toggleListening("learned", (text) => {
                  setLearned((prev) => appendText(prev, text));
                  setDirty(true);
                })
              }
            />
          </div>
        </div>

        {/* Sekcja 4 — Cytat (opcjonalny) */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Cytat na dziś{" "}
            <span className="normal-case tracking-normal font-normal text-[11px]">(opcjonalnie)</span>
          </span>
          <div className="group flex items-start gap-2">
            <textarea
              ref={quoteRef}
              className={TEXTAREA_CLASS}
              value={quote}
              onChange={(e) => { setQuote(e.target.value); setDirty(true); }}
              placeholder={'„…"'}
              rows={1}
            />
            <MicButton
              fieldId="quote"
              isActive={activeField === "quote"}
              isSupported={isSupported}
              isTranscribing={isTranscribing}
              onToggle={() =>
                toggleListening("quote", (text) => {
                  setQuote((prev) => appendText(prev, text));
                  setDirty(true);
                })
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
