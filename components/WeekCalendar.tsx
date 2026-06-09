"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Entry } from "@/hooks/useEntries";

const MONTHS_SHORT = [
  "STY", "LUT", "MAR", "KWI", "MAJ", "CZE",
  "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU",
];
const DAYS_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface WeekCalendarProps {
  entries: Entry[];
  selectedDate: string | null;
  onSelect: (dateStr: string) => void;
}

const DAYS_BACK = 90;

export function WeekCalendar({ entries, selectedDate, onSelect }: WeekCalendarProps) {
  const today = new Date();
  const containerRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  function cancelMomentum() {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }

  function startMomentum() {
    const el = containerRef.current;
    if (!el) return;
    let v = -velocity.current * 12;
    function step() {
      if (!el || Math.abs(v) < 0.3) return;
      el.scrollLeft += v;
      v *= 0.93;
      rafId.current = requestAnimationFrame(step);
    }
    rafId.current = requestAnimationFrame(step);
  }

  function onMouseDown(e: React.MouseEvent) {
    cancelMomentum();
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastTime.current;
    const dx = e.pageX - lastX.current;
    if (dt > 0) velocity.current = dx / dt;
    lastX.current = e.pageX;
    lastTime.current = now;
    const x = e.pageX - containerRef.current.offsetLeft;
    containerRef.current.scrollLeft = scrollLeftStart.current - (x - startX.current);
  }

  function stopDrag() {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
      containerRef.current.style.userSelect = "";
    }
    startMomentum();
  }

  const days = Array.from({ length: DAYS_BACK }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS_BACK - 1 - i));
    const dateStr = toLocalDateString(d);
    const entriesForDay = entries.filter((e) => e.date === dateStr);
    const standardEntry = entriesForDay.find((e) => e.type === "standard");
    const hasAny = entriesForDay.length > 0;
    return { d, dateStr, standardEntry, hasAny, hasOnlyReflections: hasAny && !standardEntry };
  });

  return (
    <div className="px-3 pt-3 pb-2">
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scrollbar-none cursor-grab px-1 py-1.5"
        style={{ willChange: "scroll-position" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {days.map(({ d, dateStr, standardEntry, hasAny, hasOnlyReflections }) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === toLocalDateString(today);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => hasAny && onSelect(dateStr)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 min-w-[52px]",
                "transition-colors duration-150",
                hasAny ? "cursor-pointer" : "opacity-40 cursor-default pointer-events-none",
                isSelected
                  ? "ring-2 ring-primary bg-primary/10"
                  : hasAny
                  ? "ring-1 ring-primary/30 bg-accent/50 hover:bg-accent"
                  : "ring-1 ring-foreground/10 bg-card"
              )}
            >
              <span className={cn(
                "font-serif text-xl font-bold leading-none",
                isSelected ? "text-primary" : isToday ? "text-primary/80" : "text-foreground"
              )}>
                {String(d.getDate()).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                {MONTHS_SHORT[d.getMonth()]}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {DAYS_SHORT[d.getDay()]}
              </span>
              {standardEntry ? (
                <span className="text-base leading-none mt-0.5">{MOOD_EMOJI[standardEntry.mood]}</span>
              ) : hasOnlyReflections ? (
                <span className="text-sm leading-none mt-0.5">💬</span>
              ) : (
                <span className="h-5 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
