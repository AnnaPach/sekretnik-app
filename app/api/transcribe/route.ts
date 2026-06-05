import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Brak klucza GROQ_API_KEY" }, { status: 500 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio") as Blob | null;
  if (!audio) {
    return NextResponse.json({ error: "Brak pliku audio" }, { status: 400 });
  }

  // Forward to Groq Whisper
  const groqForm = new FormData();
  groqForm.append("file", audio, "audio.webm");
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "pl");
  groqForm.append("response_format", "json");

  const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    console.error("[Groq] error:", groqRes.status, err);
    return NextResponse.json({ error: `Groq ${groqRes.status}: ${err}` }, { status: groqRes.status });
  }

  const data = (await groqRes.json()) as { text: string };
  console.log("[Groq] transkrypcja:", data.text);
  return NextResponse.json({ text: data.text });
}
