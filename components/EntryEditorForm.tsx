"use client";

import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import { useRouter } from "next/navigation";
import { useEntries } from "@/hooks/useEntries";
import { MoodPicker } from "@/components/MoodPicker";
import { Button } from "@/components/ui/button";

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
  "w-full bg-transparent border-none outline-none resize-none overflow-hidden text-sm leading-relaxed text-foreground placeholder:text-border";

export function EntryEditorForm({ id }: { id?: string }) {
  const router = useRouter();
  const { addEntry, updateEntry, getEntry } = useEntries();

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [moments, setMoments] = useState<[string, string, string]>(["", "", ""]);
  const [gratitude, setGratitude] = useState("");
  const [learned, setLearned] = useState("");
  const [quote, setQuote] = useState("");
  const [mood, setMood] = useState(3);
  const [dirty, setDirty] = useState(false);

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
    if (id) {
      const entry = getEntry(id);
      if (!entry) { router.replace("/"); return; }
      setTitle(entry.title);
      setMoments(entry.moments ?? ["", "", ""]);
      setGratitude(entry.gratitude ?? "");
      setLearned(entry.learned ?? "");
      setQuote(entry.quote ?? "");
      setMood(entry.mood);
    }
  }, [id]);

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

  function handleSave() {
    if (!canSave) return;
    const data = { title: title.trim(), moments, gratitude, learned, quote, mood };
    if (id) {
      updateEntry(id, data);
      router.push(`/${id}`);
    } else {
      addEntry(data);
      router.push("/");
    }
  }

  function handleCancel() {
    if (dirty && !window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz wyjść?")) return;
    router.back();
  }

  const hasContent = moments.some((m) => m.trim()) || gratitude.trim() || learned.trim();
  const canSave = title.trim().length > 0 && hasContent;

  return (
    <div className="flex flex-col min-h-dvh max-w-2xl mx-auto w-full px-4">
      <header className="flex items-center justify-between py-5 gap-3">
        <button
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
          aria-label="Wróć"
        >
          ←
        </button>
        <span className="text-sm text-muted-foreground flex-1 text-center">
          {formatDate(today)}
        </span>
        <Button onClick={handleSave} disabled={!canSave} size="sm">
          Zapisz
        </Button>
      </header>

      <main className="flex flex-col gap-4 pb-10 flex-1">
        <input
          className="font-serif text-2xl font-bold bg-transparent border-none outline-none w-full text-foreground placeholder:text-border"
          placeholder="Tytuł wpisu…"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          maxLength={120}
          autoFocus
        />

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
            <div key={i} className="flex items-start gap-3">
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
            </div>
          ))}
        </div>

        {/* Sekcja 2 — Wdzięczność */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Dzisiaj jestem wdzięczna/y za
          </span>
          <textarea
            ref={gratitudeRef}
            className={TEXTAREA_CLASS}
            value={gratitude}
            onChange={(e) => { setGratitude(e.target.value); setDirty(true); }}
            placeholder="…"
            rows={1}
          />
        </div>

        {/* Sekcja 3 — Nauka */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Dziś nauczyłam/em się
          </span>
          <textarea
            ref={learnedRef}
            className={TEXTAREA_CLASS}
            value={learned}
            onChange={(e) => { setLearned(e.target.value); setDirty(true); }}
            placeholder="…"
            rows={1}
          />
        </div>

        {/* Sekcja 4 — Cytat (opcjonalny) */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Cytat na dziś{" "}
            <span className="normal-case tracking-normal font-normal text-[11px]">(opcjonalnie)</span>
          </span>
          <textarea
            ref={quoteRef}
            className={TEXTAREA_CLASS}
            value={quote}
            onChange={(e) => { setQuote(e.target.value); setDirty(true); }}
            placeholder={'„…"'}
            rows={1}
          />
        </div>
      </main>
    </div>
  );
}
