import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Message, Entry } from "@/hooks/useEntries";
import type { UserSettings } from "@/hooks/useSettings";

// Lazy init — klucz musi być dostępny w czasie wywołania, nie przy starcie modułu
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "WSTAW_TUTAJ_SWOJ_KLUCZ_ANTHROPIC") {
    throw new Error("ANTHROPIC_API_KEY nie jest ustawiony w zmiennych środowiskowych");
  }
  return new Anthropic({ apiKey });
}

const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const DAYS_PL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

function formatDatePL(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(iso);
  return `${DAYS_PL[date.getDay()]}, ${day} ${MONTHS_PL[month - 1]} ${year}`;
}

const MOOD_LABELS: Record<number, string> = {
  1: "bardzo zły (1/5)",
  2: "zły (2/5)",
  3: "neutralny (3/5)",
  4: "dobry (4/5)",
  5: "bardzo dobry (5/5)",
};

function buildJournalContext(entries: Entry[], currentDate: string): string {
  const standard = entries
    .filter((e) => e.type === "standard")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);

  const reflections = entries
    .filter((e) => e.type === "reflection" && e.date !== currentDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  let ctx = "=== DZIENNIK PACJENTA ===\n\n";

  ctx += "--- Wpisy codzienne ---\n";
  for (const e of standard) {
    ctx += `\n[${formatDatePL(e.date)}] Nastrój: ${MOOD_LABELS[e.mood] ?? e.mood}\n`;
    if (e.title) ctx += `Tytuł: ${e.title}\n`;
    const moments = e.moments?.filter(Boolean);
    if (moments?.length) ctx += `Najmilsze momenty: ${moments.join(", ")}\n`;
    if (e.gratitude) ctx += `Wdzięczność: ${e.gratitude}\n`;
    if (e.learned) ctx += `Nauczyłam/em się: ${e.learned}\n`;
    if (e.quote) ctx += `Cytat: ${e.quote}\n`;
  }

  if (reflections.length) {
    ctx += "\n--- Poprzednie przemyślenia ---\n";
    for (const e of reflections) {
      ctx += `\n[${formatDatePL(e.date)}]\n`;
      const userMsgs = (e.messages ?? []).filter((m) => m.role === "user");
      if (userMsgs.length) {
        ctx += userMsgs.map((m) => m.content).join("\n") + "\n";
      } else if (e.reflection) {
        ctx += e.reflection + "\n";
      }
    }
  }

  return ctx;
}

const BASE_SYSTEM_PROMPT = `Jesteś Zygmuntem Freudem — wiedeńskim psychiatrą, twórcą psychoanalizy, żyjącym na przełomie XIX i XX wieku. Rozmawiasz z pacjentem, który prowadzi prywatny dziennik uważności i wdzięczności. Masz pełny dostęp do jego wpisów.

Twoja osobowość:
- Ciepły, empatyczny i nieoceniający — pacjent czuje się przy Tobie bezpiecznie i rozumiany
- Jednocześnie dociekliwy i odważny — delikatnie drążysz głębiej, nie pozwalasz uciekać od trudnych emocji
- Nawiązujesz naturalnie do swoich teorii (nieświadome, id/ego/superego, sny, symbole, przeniesienie) — ale bez wykładów, zawsze w kontekście tego, co mówi pacjent
- Mówisz po polsku, z elegancją i spokojem. Możesz użyć od czasu do czasu trochę staromodnego sformułowania, które podkreśli Twój charakter, ale nie przesadzaj
- Odpowiedzi: 2–4 zdania refleksji lub obserwacji, a następnie jedno otwarte pytanie, które zaprasza do dalszego zgłębiania
- Nigdy nie dajesz gotowych odpowiedzi ani rad wprost — pomagasz pacjentowi samemu dojść do prawdy
- Jeśli pacjent wspomina sny, symbole, relacje z rodzicami lub powtarzające się wzorce — zwróć na to szczególną uwagę`;

function buildPatientContext(settings?: UserSettings): string {
  if (!settings) return "";

  const lines: string[] = ["\n=== DANE PACJENTA ==="];

  if (settings.name) {
    lines.push(`Imię pacjenta: ${settings.name}`);
  }

  if (settings.gender === "kobieta") {
    const name = settings.name ? settings.name : "pacjentka";
    lines.push(`Płeć: kobieta`);
    lines.push(`Forma zwrotu: używaj żeńskiej formy gramatycznej. Mów „Pani${settings.name ? ` ${settings.name}` : ""}", „zrobiłaś", „czułaś", „widziałaś", „nauczyłaś się" itp.`);
  } else if (settings.gender === "mezczyzna") {
    lines.push(`Płeć: mężczyzna`);
    lines.push(`Forma zwrotu: używaj męskiej formy gramatycznej. Mów „Panie${settings.name ? ` ${settings.name}` : ""}", „zrobiłeś", „czułeś", „widziałeś", „nauczyłeś się" itp.`);
  } else {
    lines.push(`Płeć: niespecyfikowana`);
    lines.push(`Forma zwrotu: zwracaj się przez „Ty", używaj neutralnych form tam gdzie możliwe. ${settings.name ? `Mów po imieniu: „${settings.name}".` : ""}`);
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let anthropic: Anthropic;
  try {
    anthropic = getClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Brak klucza API";
    console.error("[therapist] Błąd inicjalizacji klienta:", msg);
    return new Response(msg, { status: 500 });
  }

  const body = await req.json() as {
    messages: Message[];
    journalEntries: Entry[];
    currentDate: string;
    userSettings?: UserSettings;
  };

  const { messages, journalEntries, currentDate, userSettings } = body;

  const journalContext = buildJournalContext(journalEntries, currentDate);
  const patientContext = buildPatientContext(userSettings);
  const systemContent = `${BASE_SYSTEM_PROMPT}${patientContext}\n\n${journalContext}\n\n=== AKTUALNA SESJA: ${formatDatePL(currentDate)} ===`;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // Anthropic requires conversation to start with user message
  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
    return new Response("Brak wiadomości użytkownika", { status: 400 });
  }

  let stream;
  try {
    stream = await anthropic.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 400,
      temperature: 0.85 as never,
      system: systemContent,
      messages: anthropicMessages,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Błąd streamowania";
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
