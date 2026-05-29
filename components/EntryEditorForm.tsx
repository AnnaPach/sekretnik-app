"use client";

import { useState, useEffect } from "react";
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

  function handleMoment(index: number, value: string) {
    setMoments((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
    setDirty(true);
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
              <span className="text-sm font-semibold text-muted-foreground pt-1.5 min-w-[14px]">{i + 1}</span>
              <textarea
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-border"
                value={moments[i]}
                onChange={(e) => handleMoment(i, e.target.value)}
                placeholder="…"
                rows={2}
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
            className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-border"
            value={gratitude}
            onChange={(e) => { setGratitude(e.target.value); setDirty(true); }}
            placeholder="…"
            rows={3}
          />
        </div>

        {/* Sekcja 3 — Nauka */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Dziś nauczyłam/em się
          </span>
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-border"
            value={learned}
            onChange={(e) => { setLearned(e.target.value); setDirty(true); }}
            placeholder="…"
            rows={3}
          />
        </div>

        {/* Sekcja 4 — Cytat (opcjonalny) */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Cytat na dziś{" "}
            <span className="normal-case tracking-normal font-normal text-[11px]">(opcjonalnie)</span>
          </span>
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-border"
            value={quote}
            onChange={(e) => { setQuote(e.target.value); setDirty(true); }}
            placeholder={'„…"'}
            rows={2}
          />
        </div>
      </main>
    </div>
  );
}
