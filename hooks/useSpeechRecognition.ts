"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FieldId =
  | "title"
  | "moments-0"
  | "moments-1"
  | "moments-2"
  | "gratitude"
  | "learned"
  | "quote";

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  activeField: FieldId | null;
  isTranscribing: boolean;
  toggleListening: (fieldId: FieldId, onTranscript: (text: string) => void) => void;
  stopListening: () => void;
}

function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [activeField, setActiveField] = useState<FieldId | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    setIsSupported(isMediaRecorderSupported());
  }, []);

  const stopListening = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setActiveField(null);
      return;
    }

    // stopListening resolves after onstop fires and Groq responds
    await new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActiveField(null);

        if (blob.size < 1000) { resolve(); return; } // zbyt krótkie nagranie

        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          if (res.ok) {
            const data = (await res.json()) as { text: string };
            if (data.text?.trim() && onTranscriptRef.current) {
              onTranscriptRef.current(data.text.trim());
            }
          } else {
            console.error("[Groq] odpowiedź:", res.status);
          }
        } catch (err) {
          console.error("[Groq] fetch error:", err);
        } finally {
          setIsTranscribing(false);
        }
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const startListening = useCallback(
    async (fieldId: FieldId, onTranscript: (text: string) => void) => {
      // Zatrzymaj poprzednią sesję jeśli była
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }

      onTranscriptRef.current = onTranscript;
      chunksRef.current = [];

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        console.error("[Mic] brak dostępu do mikrofonu");
        return;
      }

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setActiveField(fieldId);
    },
    []
  );

  const toggleListening = useCallback(
    (fieldId: FieldId, onTranscript: (text: string) => void) => {
      if (activeField === fieldId) {
        stopListening();
      } else {
        startListening(fieldId, onTranscript);
      }
    },
    [activeField, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isSupported, activeField, isTranscribing, toggleListening, stopListening };
}
