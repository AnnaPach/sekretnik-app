"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Entry } from "@/hooks/useEntries";
import type { UserSettings } from "@/hooks/useSettings";

export function useTherapistChat(entry: Entry, allEntries: Entry[], userSettings?: UserSettings) {
  const [messages, setMessages] = useState<Message[]>(entry.messages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const supabase = createClient();
  const autoTriggered = useRef(false);

  // Persist messages to Supabase
  const saveMessages = useCallback(async (msgs: Message[]) => {
    await supabase.from("entries").update({ messages: msgs }).eq("id", entry.id);
  }, [entry.id]);

  const callFreud = useCallback(async (currentMessages: Message[]) => {
    setIsStreaming(true);
    setStreamingText("");

    let fullText = "";
    let errorText = "";

    try {
      const res = await fetch("/api/therapist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          journalEntries: allEntries,
          currentDate: entry.date,
          userSettings,
        }),
      });

      if (!res.ok) {
        errorText = await res.text();
      } else {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStreamingText(fullText);
        }
      }
    } catch (e) {
      errorText = e instanceof Error ? e.message : "Wystąpił błąd połączenia.";
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }

    const content = fullText || errorText || null;
    if (!content) return;

    const therapistMsg: Message = {
      role: "therapist",
      content: fullText
        ? fullText
        : `⚠️ Błąd: ${errorText}`,
      created_at: new Date().toISOString(),
    };
    const finalMessages = [...currentMessages, therapistMsg];
    setMessages(finalMessages);
    // Nie zapisuj wiadomości błędu do bazy — tylko udane odpowiedzi
    if (fullText) await saveMessages(finalMessages);
  }, [allEntries, entry.date, saveMessages]);

  // Auto-trigger Freud if last message is from user (e.g. first load after creating entry)
  useEffect(() => {
    if (autoTriggered.current) return;
    if (messages.length > 0 && messages[messages.length - 1].role === "user" && !isStreaming) {
      autoTriggered.current = true;
      callFreud(messages);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveMessages(newMessages);
    await callFreud(newMessages);
  }, [messages, saveMessages, callFreud]);

  return { messages, sendMessage, isStreaming, streamingText };
}
