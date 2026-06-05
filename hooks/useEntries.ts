"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Entry {
  id: string;
  date: string;
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
  content?: string;
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
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("entries")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setEntries(
            (data ?? []).map((row) => ({
              id: row.id,
              date: row.date,
              title: row.title,
              moments: row.moments as [string, string, string],
              gratitude: row.gratitude,
              learned: row.learned,
              quote: row.quote,
              mood: row.mood,
            }))
          );
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const addEntry = useCallback(async (data: NewEntryData): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: row, error } = await supabase
      .from("entries")
      .insert({
        user_id: user!.id,
        date: new Date().toISOString().slice(0, 10),
        ...data,
      })
      .select()
      .single();
    if (error) throw error;
    const entry: Entry = {
      id: row.id,
      date: row.date,
      title: row.title,
      moments: row.moments as [string, string, string],
      gratitude: row.gratitude,
      learned: row.learned,
      quote: row.quote,
      mood: row.mood,
    };
    setEntries((prev) => [entry, ...prev]);
    return entry.id;
  }, []);

  const updateEntry = useCallback(async (id: string, data: NewEntryData) => {
    const { data: row, error } = await supabase
      .from("entries")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...data }
          : e
      )
    );
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from("entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getEntry = useCallback(
    (id: string): Entry | null => entries.find((e) => e.id === id) ?? null,
    [entries]
  );

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return { entries: sorted, addEntry, updateEntry, deleteEntry, getEntry, loaded };
}
