"use client";

import { useRouter } from "next/navigation";
import { useEntries } from "@/hooks/useEntries";
import { Button } from "@/components/ui/button";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DAYS_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

type Entry = ReturnType<typeof useEntries>["entries"][number];

function getExcerpt(entry: Entry): string {
  const text = entry.moments?.find(Boolean) || entry.gratitude || entry.learned || (entry.content ? entry.content.replace(/<[^>]*>/g, "") : "");
  return text.slice(0, 80) + (text.length > 80 ? "…" : "");
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

export default function EntryList() {
  const router = useRouter();
  const { entries, loaded } = useEntries();
  const groups = groupByMonth(entries);

  if (!loaded) return null;

  return (
    <div className="flex flex-col min-h-dvh max-w-2xl mx-auto w-full px-4">
      <header className="py-10 border-b border-border mb-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Co Dziś Odkryłam</h1>
        <p className="text-sm text-muted-foreground italic mt-1">Dziennik Uważności i Wdzięczności</p>
      </header>

      <main className="flex-1 pb-24">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Tu będą żyć Twoje myśli.<br />Napisz pierwszy wpis.
            </p>
            <Button onClick={() => router.push("/new")}>Napisz pierwszy wpis</Button>
          </div>
        ) : (
          Object.entries(groups).map(([month, monthEntries]) => (
            <section key={month} className="mt-8">
              <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3 uppercase">
                {month}
              </h2>
              <ul className="flex flex-col gap-2">
                {monthEntries.map((entry) => {
                  const { day, month: mon, weekday } = formatCardDate(entry.date);
                  const excerpt = getExcerpt(entry);
                  return (
                    <li key={entry.id}>
                      <div
                        className="flex items-center gap-4 p-4 bg-card rounded-xl ring-1 ring-foreground/10 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => router.push(`/${entry.id}`)}
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

      {/* Mobile: floating "+" button */}
      <Button
        size="icon"
        className="sm:hidden fixed bottom-7 right-7 w-14 h-14 rounded-full text-2xl shadow-lg shadow-primary/30"
        onClick={() => router.push("/new")}
        aria-label="Nowy wpis"
      >
        +
      </Button>

      {/* Desktop: fixed centered button at the bottom */}
      <Button
        className="hidden sm:inline-flex fixed bottom-8 left-1/2 -translate-x-1/2 px-10 py-5 text-base rounded-full shadow-lg shadow-primary/30"
        onClick={() => router.push("/new")}
      >
        Dodaj nowy wpis
      </Button>
    </div>
  );
}
