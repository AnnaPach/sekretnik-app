"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Message {
  role: "user" | "therapist";
  content: string;
  created_at: string;
}

export interface Entry {
  id: string;
  date: string;
  type: "standard" | "reflection";
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
  content?: string;
  reflection?: string;
  messages?: Message[];
}

type NewEntryData = {
  title: string;
  moments: [string, string, string];
  gratitude: string;
  learned: string;
  quote: string;
  mood: number;
};

function mapRow(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    date: row.date as string,
    type: (row.type as string) === "reflection" ? "reflection" : "standard",
    title: (row.title as string) ?? "",
    moments: (row.moments as [string, string, string]) ?? ["", "", ""],
    gratitude: (row.gratitude as string) ?? "",
    learned: (row.learned as string) ?? "",
    quote: (row.quote as string) ?? "",
    mood: (row.mood as number) ?? 3,
    reflection: (row.reflection as string) ?? "",
    messages: (row.messages as Message[]) ?? [],
  };
}

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
          setEntries((data ?? []).map(mapRow));
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
        type: "standard",
        ...data,
      })
      .select()
      .single();
    if (error) throw error;
    const entry = mapRow(row);
    setEntries((prev) => [entry, ...prev]);
    return entry.id;
  }, []);

  const addReflection = useCallback(async (text: string): Promise<string> => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = entries.find((e) => e.date === todayStr && e.type === "reflection");
    if (existing) {
      const newText = (existing.reflection ?? "") + "\n\n" + text;
      const { error } = await supabase
        .from("entries")
        .update({ reflection: newText })
        .eq("id", existing.id);
      if (error) throw error;
      setEntries((prev) => prev.map((e) => e.id === existing.id ? { ...e, reflection: newText } : e));
      return existing.id;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const firstMessage: Message = { role: "user", content: text, created_at: new Date().toISOString() };
    const { data: row, error } = await supabase
      .from("entries")
      .insert({
        user_id: user!.id,
        date: todayStr,
        type: "reflection",
        title: "",
        moments: ["", "", ""],
        gratitude: "",
        learned: "",
        quote: "",
        mood: 3,
        reflection: text,
        messages: [firstMessage],
      })
      .select()
      .single();
    if (error) throw error;
    const entry = mapRow(row);
    setEntries((prev) => [entry, ...prev]);
    return entry.id;
  }, [entries]);

  const updateMessages = useCallback(async (id: string, messages: Message[]) => {
    const { error } = await supabase
      .from("entries")
      .update({ messages })
      .eq("id", id);
    if (error) throw error;
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, messages } : e));
  }, []);

  const updateReflection = useCallback(async (id: string, text: string) => {
    const { error } = await supabase
      .from("entries")
      .update({ reflection: text })
      .eq("id", id);
    if (error) throw error;
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, reflection: text } : e));
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
      prev.map((e) => e.id === id ? { ...e, ...data } : e)
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

  return { entries: sorted, addEntry, addReflection, updateReflection, updateMessages, updateEntry, deleteEntry, getEntry, loaded };
}
