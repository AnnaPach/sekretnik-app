"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { useEntries } from "@/hooks/useEntries";
import type { Message } from "@/hooks/useEntries";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Button } from "@/components/ui/button";
import { WeekCalendar } from "@/components/WeekCalendar";
import { AIChatBar } from "@/components/AIChatBar";
import { EntryDetailPanel } from "@/components/EntryDetailPanel";
import { EntryEditorForm } from "@/components/EntryEditorForm";
import { TherapistChatPanel } from "@/components/TherapistChatPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { createClient } from "@/lib/supabase/client";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const MONTHS_GEN = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const DAYS_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

type Entry = ReturnType<typeof useEntries>["entries"][number];

type RightPanelMode =
  | { mode: "empty" }
  | { mode: "viewing"; entryId: string }
  | { mode: "creating" }
  | { mode: "editing"; entryId: string };

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByMonth(entries: Entry[]) {
  const groups: Record<string, Entry[]> = {};
  for (const entry of entries) {
    const [year, month] = entry.date.split("-");
    const key = `${MONTHS_PL[parseInt(month) - 1].toUpperCase()} ${year}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

function formatCardDate(iso: string) {
  const [, month, day] = iso.split("-");
  const date = new Date(iso);
  return {
    day,
    month: MONTHS_PL[parseInt(month) - 1].slice(0, 3).toUpperCase(),
    weekday: DAYS_SHORT[date.getDay()],
  };
}

function formatFilterLabel(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS_GEN[month - 1]}`;
}

function ReflectionEditor({
  entry,
  onSave,
  onCancel,
}: {
  entry: Entry;
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(entry.reflection ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try { await onSave(text); } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col flex-1 px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={onCancel}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
          aria-label="Anuluj">←</button>
        <button type="button" onClick={handleSave} disabled={!text.trim() || saving}
          className="text-sm font-semibold text-primary disabled:opacity-40 transition-opacity">
          Zapisz
        </button>
      </div>
      <span className="text-4xl mb-5">💬</span>
      <textarea
        className="flex-1 w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 min-h-[200px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Napisz swoje przemyślenia…"
        autoFocus
      />
    </div>
  );
}

export default function EntryList() {
  const router = useRouter();
  const { entries, loaded, addEntry, addReflection, updateReflection, updateMessages, updateEntry, deleteEntry } = useEntries();
  const isDesktop = useIsDesktop();
  const supabase = createClient();
  const [panel, setPanel] = useState<RightPanelMode>({ mode: "empty" });
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [barValue, setBarValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { activeField, isTranscribing, toggleListening } = useSpeechRecognition();

  // Auto-select today's standard entry on load
  useEffect(() => {
    if (!loaded) return;
    const todayEntry = entries.find((e) => e.date === getTodayStr() && e.type === "standard");
    if (todayEntry) {
      setPanel({ mode: "viewing", entryId: todayEntry.id });
    }
  }, [loaded]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Calendar click → filter list + view in right panel (desktop)
  function handleCalendarSelect(dateStr: string) {
    setFilteredDate(dateStr);
    if (isDesktop) {
      const std = entries.find((e) => e.date === dateStr && e.type === "standard");
      const any = entries.find((e) => e.date === dateStr);
      const target = std ?? any;
      if (target) setPanel({ mode: "viewing", entryId: target.id });
    }
  }

  // List click → view entry
  function handleListSelect(id: string) {
    if (isDesktop) {
      setPanel({ mode: "viewing", entryId: id });
    } else {
      router.push(`/${id}`);
    }
  }

  // "Dodaj nowy wpis" — only for standard entries (one per day)
  function handleNewEntry() {
    const todayStandard = entries.find((e) => e.date === getTodayStr() && e.type === "standard");
    if (todayStandard) {
      if (isDesktop) {
        setPanel({ mode: "editing", entryId: todayStandard.id });
      } else {
        router.push(`/edit/${todayStandard.id}`);
      }
    } else {
      if (isDesktop) {
        setPanel({ mode: "creating" });
      } else {
        router.push("/new");
      }
    }
  }

  // Mic button — fills the bar with transcription
  function handleMicPress() {
    toggleListening("reflection", (transcript) => {
      setBarValue((prev) => prev ? `${prev} ${transcript}` : transcript);
    });
  }

  // Otwórz sesję z Freudem — opcjonalnie z pierwszą wiadomością
  const handleOpenSession = useCallback(async (initialText?: string) => {
    setIsSending(true);
    try {
      // Znajdź lub stwórz dzisiejszą refleksję
      const todayStr = getTodayStr();
      const existing = entries.find((e) => e.date === todayStr && e.type === "reflection");
      let reflectionId: string;
      if (existing) {
        reflectionId = existing.id;
      } else {
        reflectionId = await addReflection(""); // puste — konwersacja jest w messages
      }

      // Jeśli podano tekst, dodaj go jako pierwszą wiadomość użytkownika
      if (initialText?.trim()) {
        const entry = entries.find((e) => e.id === reflectionId);
        const userMsg: Message = {
          role: "user",
          content: initialText.trim(),
          created_at: new Date().toISOString(),
        };
        await updateMessages(reflectionId, [...(entry?.messages ?? []), userMsg]);
      }

      setBarValue("");
      if (isDesktop) {
        setPanel({ mode: "viewing", entryId: reflectionId });
      } else {
        router.push(`/${reflectionId}`);
      }
    } finally {
      setIsSending(false);
    }
  }, [entries, addReflection, updateMessages, isDesktop]);

  if (!loaded) return null;

  const selectedEntryId =
    panel.mode === "viewing" ? panel.entryId :
    panel.mode === "editing" ? panel.entryId :
    null;

  const displayedEntries = filteredDate
    ? entries.filter((e) => e.date === filteredDate)
    : entries;
  const groups = groupByMonth(displayedEntries);

  const todayHasStandard = entries.some((e) => e.date === getTodayStr() && e.type === "standard");
  const addButtonLabel = todayHasStandard ? "Edytuj wpis z dziś" : "Dodaj nowy wpis";
  const isRecording = activeField === "reflection";

  return (
    <div className="flex min-h-dvh w-full">
      {/* ─── LEWA KOLUMNA ─── */}
      <div className="flex flex-col w-full lg:w-[380px] lg:flex-shrink-0 lg:border-r lg:border-border lg:h-dvh lg:sticky lg:top-0 lg:overflow-hidden">
        <header className="px-4 pt-8 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">Sekretnik</h1>
              <p className="text-sm text-muted-foreground italic mt-1">Dziennik Uważności i Wdzięczności</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <SettingsPanel />
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Wyloguj"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </header>

        <WeekCalendar
          entries={entries}
          selectedDate={filteredDate}
          onSelect={handleCalendarSelect}
        />

        <main className="flex-1 lg:overflow-y-auto scrollbar-beige pb-36 lg:pb-24 px-4">
          {/* Mobile: Dodaj nowy wpis button under calendar */}
          <div className="lg:hidden mt-4 mb-1">
            <Button
              variant="outline"
              className="w-full rounded-xl py-3"
              onClick={handleNewEntry}
            >
              {addButtonLabel}
            </Button>
          </div>

          {/* Filter bar */}
          {filteredDate && (
            <div className="flex items-center justify-between mt-4 mb-1">
              <span className="text-xs text-muted-foreground">
                Wpisy z {formatFilterLabel(filteredDate)}
              </span>
              <button
                onClick={() => setFilteredDate(null)}
                className="text-xs text-primary hover:underline underline-offset-2 transition-colors"
              >
                Pokaż wszystkie
              </button>
            </div>
          )}

          {displayedEntries.length === 0 && !filteredDate ? (
            <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
              <p className="text-muted-foreground text-lg leading-relaxed">
                Tu będą żyć Twoje myśli.<br />Napisz pierwszy wpis.
              </p>
              <Button onClick={handleNewEntry}>Napisz pierwszy wpis</Button>
            </div>
          ) : displayedEntries.length === 0 && filteredDate ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground text-sm">Brak wpisów w tym dniu.</p>
            </div>
          ) : (
            Object.entries(groups).map(([month, monthEntries]) => (
              <section key={month} className="mt-6">
                {!filteredDate && (
                  <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3 uppercase">
                    {month}
                  </h2>
                )}
                <ul className="flex flex-col gap-2">
                  {monthEntries.map((entry) => {
                    const isActive = selectedEntryId === entry.id;

                    if (entry.type === "reflection") {
                      const firstMsg = entry.messages?.find((m) => m.role === "user")?.content;
                      const previewText = firstMsg || entry.reflection || "Sesja terapeutyczna";
                      const msgCount = entry.messages?.length ?? 0;
                      return (
                        <li key={entry.id}>
                          <div
                            className={`flex items-start gap-3 p-4 bg-card rounded-xl ring-1 cursor-pointer transition-colors ${
                              isActive
                                ? "ring-primary/50 bg-primary/5"
                                : "ring-foreground/10 hover:bg-accent"
                            }`}
                            onClick={() => handleListSelect(entry.id)}
                          >
                            <span className="text-base flex-shrink-0 mt-0.5 opacity-70">💬</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                                {previewText}
                              </p>
                              {msgCount > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {msgCount} {msgCount === 1 ? "wiadomość" : msgCount < 5 ? "wiadomości" : "wiadomości"}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    }

                    const { day, month: mon, weekday } = formatCardDate(entry.date);
                    const excerptText = entry.moments?.find(Boolean) || entry.gratitude || entry.learned || (entry.content ? entry.content.replace(/<[^>]*>/g, "") : "");
                    const excerpt = excerptText ? excerptText.slice(0, 80) + (excerptText.length > 80 ? "…" : "") : "";

                    return (
                      <li key={entry.id}>
                        <div
                          className={`flex items-center gap-4 p-4 bg-card rounded-xl ring-1 cursor-pointer transition-colors ${
                            isActive
                              ? "ring-primary/50 bg-primary/5"
                              : "ring-foreground/10 hover:bg-accent"
                          }`}
                          onClick={() => handleListSelect(entry.id)}
                        >
                          <div className="flex flex-col items-center min-w-[36px]">
                            <span className="font-serif text-xl font-bold text-primary leading-none">{day}</span>
                            <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mt-0.5">{mon}</span>
                            <span className="text-[10px] text-muted-foreground">{weekday}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{entry.title}</p>
                            {excerpt && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{excerpt}</p>
                            )}
                          </div>
                          <span className="text-lg flex-shrink-0">{MOOD_EMOJI[entry.mood]}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </main>

        {/* Mobile: dolny pasek — rozmowa z Freudem */}
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 px-4 pt-2 bg-background/80 backdrop-blur-sm border-t border-border/40"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <AIChatBar
            value={barValue}
            onChange={setBarValue}
            onSend={handleOpenSession}
            isTranscribing={isTranscribing}
            isSending={isSending}
            actionButton={
              <Button
                size="icon"
                className={`w-12 h-12 rounded-full shadow-lg flex-shrink-0 ${
                  isRecording ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30" : "shadow-primary/30"
                }`}
                onClick={handleMicPress}
                aria-label={isRecording ? "Zatrzymaj nagrywanie" : "Nagraj głosowo"}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>
            }
          />
        </div>

        {/* Desktop: button at bottom of left column */}
        <div className="hidden lg:block sticky bottom-0 px-4 py-4 bg-gradient-to-t from-background via-background/90 to-transparent">
          <Button
            className="w-full rounded-full py-5 text-base shadow-lg shadow-primary/20"
            onClick={handleNewEntry}
          >
            {addButtonLabel}
          </Button>
        </div>
      </div>

      {/* ─── PRAWA KOLUMNA (tylko desktop) ─── */}
      <div className="hidden lg:flex flex-col flex-1 h-dvh overflow-y-auto relative">
        {panel.mode === "empty" && (
          <div className="flex flex-col flex-1 items-center justify-center gap-4 text-center px-8">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Wybierz dzień z kalendarza<br />lub dodaj nowy wpis.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={handleNewEntry}>{addButtonLabel}</Button>
              <Button variant="outline" onClick={() => handleOpenSession()}>
                💬 Porozmawiaj z Freudem
              </Button>
            </div>
          </div>
        )}

        {panel.mode === "viewing" && (() => {
          const entry = entries.find((e) => e.id === panel.entryId);
          if (!entry) return null;
          if (entry.type === "reflection") {
            return (
              <TherapistChatPanel
                entry={entry}
                allEntries={entries}
                onDelete={() => {
                  deleteEntry(panel.entryId);
                  setPanel({ mode: "empty" });
                  setFilteredDate(null);
                }}
                inline
              />
            );
          }
          return (
            <EntryDetailPanel
              entry={entry}
              onEdit={(id) => setPanel({ mode: "editing", entryId: id })}
              onDelete={() => {
                deleteEntry(panel.entryId);
                setPanel({ mode: "empty" });
                setFilteredDate(null);
              }}
            />
          );
        })()}

        {panel.mode === "creating" && (
          <div className="flex-1 overflow-y-auto py-6">
            <EntryEditorForm
              onSave={async (data) => {
                const id = await addEntry(data);
                setPanel({ mode: "viewing", entryId: id });
              }}
              onCancel={() => setPanel({ mode: "empty" })}
            />
          </div>
        )}

        {panel.mode === "editing" && (() => {
          const entry = entries.find((e) => e.id === panel.entryId);
          if (!entry) return null;
          if (entry.type === "reflection") {
            return (
              <ReflectionEditor
                entry={entry}
                onSave={async (text) => {
                  await updateReflection(entry.id, text);
                  setPanel({ mode: "viewing", entryId: entry.id });
                }}
                onCancel={() => setPanel({ mode: "viewing", entryId: entry.id })}
              />
            );
          }
          return (
            <div className="flex-1 overflow-y-auto py-6">
              <EntryEditorForm
                id={entry.id}
                initialData={{
                  title: entry.title,
                  moments: entry.moments,
                  gratitude: entry.gratitude,
                  learned: entry.learned,
                  quote: entry.quote,
                  mood: entry.mood,
                }}
                onSave={async (data) => {
                  await updateEntry(entry.id, data);
                  setPanel({ mode: "viewing", entryId: entry.id });
                }}
                onCancel={() => setPanel({ mode: "viewing", entryId: entry.id })}
              />
            </div>
          );
        })()}

      </div>
    </div>
  );
}
