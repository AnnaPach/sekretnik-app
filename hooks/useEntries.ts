"use client";

import { useState, useCallback, useEffect } from "react";

export interface Entry {
  id: string;
  date: string;
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
  content?: string; // legacy field for old entries
}

const STORAGE_KEY = "sekretnik_entries";

function load(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: Entry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

type NewEntryData = {
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
};

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(load());
    setLoaded(true);
  }, []);

  const addEntry = useCallback((data: NewEntryData) => {
    const entry: Entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      ...data,
    };
    setEntries((prev) => {
      const next = [entry, ...prev];
      save(next);
      return next;
    });
    return entry.id;
  }, []);

  const updateEntry = useCallback((id: string, data: NewEntryData) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
      save(next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      save(next);
      return next;
    });
  }, []);

  const getEntry = useCallback((id: string): Entry | null => {
    return load().find((e) => e.id === id) ?? null;
  }, []);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return { entries: sorted, addEntry, updateEntry, deleteEntry, getEntry, loaded };
}
