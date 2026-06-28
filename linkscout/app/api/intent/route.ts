import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/**
 * POST /api/intent
 * Body: { text: string }
 * Returns: { keywords: string[], detected_intent: string }
 *
 * Converts a free-form user phrase ("je cherche un job React à Paris")
 * into 1-3 LinkedIn-ready search keywords to feed the scraper.
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return NextResponse.json({ error: "text is required" }, { status: 422 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const system = `Tu es un assistant spécialisé dans la recherche d'emploi tech.
L'utilisateur décrit ce qu'il cherche en langage naturel (en français ou en anglais).
Ton rôle est de convertir cette description en 1 à 3 mots-clés de recherche LinkedIn optimaux.

Règles:
- Les mots-clés doivent être des intitulés de poste LinkedIn réels (ex: "React Developer", "DevOps Engineer", "Product Manager").
- Maximum 3 mots-clés, minimum 1.
- Si la phrase est déjà un titre de poste, retourne-la directement.
- Priorise les termes en anglais car c'est le standard sur LinkedIn.
- Retourne UNIQUEMENT un JSON valide: { "keywords": ["keyword1", "keyword2"], "intent": "résumé de l'intention en 1 phrase" }`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text.trim() },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 256,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Groq intent error:", errBody);
      // Fallback: return the raw text as a single keyword
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    let parsed: { keywords?: string[]; intent?: string } = {};
    try {
      parsed = JSON.parse(
        content.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "")
      );
    } catch {
      // Fallback if Groq returns malformed JSON
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    const keywords: string[] = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k) => typeof k === "string" && k.trim()).slice(0, 3)
      : [text.trim()];

    return NextResponse.json({
      keywords,
      intent: parsed.intent ?? text.trim(),
      fallback: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Intent route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
