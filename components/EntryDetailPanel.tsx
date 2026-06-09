"use client";

import { useState } from "react";
import type { Entry } from "@/hooks/useEntries";
import { MoodDisplay } from "@/components/MoodPicker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );
}

interface EntryDetailPanelProps {
  entry: Entry;
  onEdit: (id: string) => void;
  onDelete: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function EntryDetailPanel({ entry, onEdit, onDelete, showBackButton, onBack }: EntryDetailPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    setShowConfirm(false);
    onDelete();
  }

  if (entry.type === "reflection") {
    return (
      <div className="flex flex-col flex-1 px-6 lg:px-10 py-6">
        <div className="flex items-center justify-between mb-4">
          {showBackButton && onBack ? (
            <button type="button" onClick={onBack}
              className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
              aria-label="Wróć">←</button>
          ) : <div />}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onEdit(entry.id)} aria-label="Edytuj"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <IconPencil />
            </button>
            <button type="button" onClick={() => setShowConfirm(true)} aria-label="Usuń"
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <IconTrash />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{formatDate(entry.date)}</p>
        <span className="text-4xl mb-5">💬</span>
        <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{entry.reflection}</p>
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usuń przemyślenie</DialogTitle>
              <DialogDescription>Czy na pewno chcesz usunąć to przemyślenie? Tej operacji nie można cofnąć.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Anuluj</Button>
              <Button variant="destructive" onClick={handleDelete}>Usuń</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const moments = entry.moments ?? [];
  const filledMoments = moments.filter(Boolean);

  return (
    <div className="flex flex-col flex-1 px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        {showBackButton && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1 text-xl transition-colors"
            aria-label="Wróć"
          >
            ←
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(entry.id)}
            aria-label="Edytuj"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <IconPencil />
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            aria-label="Usuń"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{formatDate(entry.date)}</p>
      <h1 className="font-serif text-[1.75rem] font-bold leading-snug text-foreground mb-4">
        {entry.title}
      </h1>
      <MoodDisplay value={entry.mood} />
      <Separator className="my-6" />

      <div className="flex flex-col gap-7">
        {filledMoments.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Najmilsze momenty
            </h3>
            {filledMoments.map((m, i) => (
              <p key={i} className="text-base leading-relaxed text-foreground">
                <span className="text-muted-foreground mr-1.5">{i + 1}.</span>{m}
              </p>
            ))}
          </div>
        )}

        {entry.gratitude && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Jestem wdzięczna/y za
            </h3>
            <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{entry.gratitude}</p>
          </div>
        )}

        {entry.learned && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Dziś nauczyłam/em się
            </h3>
            <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{entry.learned}</p>
          </div>
        )}

        {entry.quote && (
          <blockquote className="relative pl-5 border-l-2 border-border">
            <span className="absolute -top-3 -left-1 font-serif text-5xl leading-none text-border select-none">&ldquo;</span>
            <p className="font-bold italic text-lg leading-relaxed text-primary">{entry.quote}</p>
          </blockquote>
        )}

        {entry.content && !filledMoments.length && !entry.gratitude && !entry.learned && (
          <div
            className="prose prose-stone max-w-none text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń wpis</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć ten wpis? Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
