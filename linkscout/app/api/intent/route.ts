import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const GROQ_MAX_RETRIES = 2;
const GROQ_BASE_DELAY_MS = 500;

const intentInputSchema = z.object({
  text: z.string().trim().min(3, "text doit contenir au moins 3 caractères"),
});

// LLM outputs are untrusted by definition — validate the shape before returning it.
const llmOutputSchema = z.object({
  keywords: z.array(z.string()).min(1).max(5),
  intent: z.string().optional(),
});

/**
 * POST /api/intent
 * Body: { text: string }
 * Returns: { keywords: string[], detected_intent: string }
 *
 * Converts a free-form user phrase ("je cherche un job React à Paris")
 * into 1-3 LinkedIn-ready search keywords to feed the scraper.
 */
/** Convert free-form user text into LinkedIn-ready search keywords via Groq LLM. */
export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }
    const inputParse = intentInputSchema.safeParse(rawBody);
    if (!inputParse.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: inputParse.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }
    const text = inputParse.data.text;

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

    async function callGroq(): Promise<Response> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
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
        return resp;
      } finally {
        clearTimeout(timeout);
      }
    }

    let resp: Response;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = GROQ_BASE_DELAY_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        resp = await callGroq();
        if (resp.ok || !isRetryableStatus(resp.status)) {
          break;
        }
        const body = await resp.text().catch(() => "");
        console.warn(`Groq intent retry ${attempt}/${GROQ_MAX_RETRIES}: ${resp.status} ${body.slice(0, 200)}`);
        lastErr = `HTTP ${resp.status}`;
      } catch (e) {
        console.warn(`Groq intent retry ${attempt}/${GROQ_MAX_RETRIES}: ${e}`);
        lastErr = e;
      }
    }

    if (!resp!.ok) {
      console.error("Groq intent error after retries:", lastErr);
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    const groqData = await resp!.json();
    const content = groqData?.choices?.[0]?.message?.content ?? "";

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(
        content.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""),
      );
    } catch {
      // Fallback if Groq returns malformed JSON
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    const llmParse = llmOutputSchema.safeParse(rawParsed);
    if (!llmParse.success) {
      console.error("[Intent] LLM output failed schema:", llmParse.error.flatten());
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    const keywords: string[] = llmParse.data.keywords
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .slice(0, 3);

    if (keywords.length === 0) {
      return NextResponse.json({ keywords: [text.trim()], intent: text.trim(), fallback: true });
    }

    return NextResponse.json({
      keywords,
      intent: llmParse.data.intent?.trim() || text.trim(),
      fallback: false,
    });
  } catch (err) {
    console.error("Intent route error:", err);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}
