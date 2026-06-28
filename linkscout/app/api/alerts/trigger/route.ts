import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function isRemoteJob(job: Record<string, unknown>): boolean {
  const loc = ((job.location as string) ?? "").toLowerCase();
  const desc = ((job.description as string) ?? "").toLowerCase();
  return loc.includes("remote") || loc.includes("distanciel") || desc.includes("remote");
}

function embedColor(score: number): number {
  if (score >= 90) return 0x10b981;
  if (score >= 70) return 0xf59e0b;
  return 0x0a66c2;
}

async function sendDiscord(webhookUrl: string, job: Record<string, unknown>) {
  const score = (job.match_score as number) || 0;
  const fields = [
    { name: "Entreprise", value: (job.company as string) || "N/A", inline: true },
    { name: "Lieu", value: (job.location as string) || "Non spécifié", inline: true },
    { name: "Match Score", value: `**${score}%**`, inline: true },
    { name: "Salaire / TJM", value: (job.salary as string) || "Non spécifié", inline: true },
  ];
  const tech = job.tech_stack as string[];
  if (tech?.length) {
    fields.push({ name: "Stack", value: tech.slice(0, 10).join(", "), inline: false });
  }

  const embed: Record<string, unknown> = {
    title: `🚀 ${job.title}`,
    url: (job.url as string) || undefined,
    color: embedColor(score),
    fields,
    footer: { text: "LinkScout — Alerte automatique" },
  };
  if (job.logo_url) embed.thumbnail = { url: job.logo_url };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "LinkScout", embeds: [embed] }),
  });
  return res.ok;
}

async function sendTelegram(webhookUrl: string, job: Record<string, unknown>) {
  const parts = webhookUrl.split("|||");
  if (parts.length !== 2) return false;
  const [botToken, chatId] = parts.map((s) => s.trim());

  const score = job.match_score || "N/A";
  const tech = job.tech_stack as string[];
  const techStr = tech?.length ? `\n🛠 Stack: ${tech.slice(0, 6).join(", ")}` : "";
  const text = [
    "<b>🚀 Nouvelle opportunité détectée !</b>\n",
    `🎯 <b>Poste :</b> ${job.title}`,
    `🏢 <b>Entreprise :</b> ${job.company}`,
    `📍 <b>Lieu :</b> ${job.location || "N/A"}`,
    `🔥 <b>Match Score :</b> ${score}%`,
    `💰 <b>Salaire :</b> ${job.salary || "Non spécifié"}${techStr}\n`,
    `<a href='${job.url || "#"}'>🔗 Voir l'offre sur LinkedIn</a>`,
  ].join("\n");

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  return res.ok;
}

export async function POST() {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured" }, { status: 500 });
  }

  const { data: alerts, error: alertErr } = await supabase
    .from("alerts")
    .select("*")
    .eq("is_active", true);

  if (alertErr) {
    return NextResponse.json({ error: alertErr.message }, { status: 500 });
  }

  if (!alerts?.length) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  let totalSent = 0;
  const errors: string[] = [];

  for (const alert of alerts) {
    const keyword = alert.keyword.toLowerCase();

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .gte("match_score", alert.min_score ?? 70)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!jobs?.length) continue;

    for (const job of jobs) {
      const j = job as Record<string, unknown>;
      const filters = (alert.filters as Record<string, unknown>) || {};
      if (filters.remote && !isRemoteJob(j)) continue;

      try {
        let ok = false;
        if (alert.platform === "discord") {
          ok = await sendDiscord(alert.webhook_url, j);
        } else if (alert.platform === "telegram") {
          ok = await sendTelegram(alert.webhook_url, j);
        }
        if (ok) totalSent++;
      } catch {
        errors.push(`Failed to send ${alert.platform} for alert ${alert.id}`);
      }

      // Auto-add high-score jobs to the user's collection
      if (alert.user_id && (j.match_score as number) >= 80) {
        try {
          await supabase
            .from("collections")
            .upsert(
              { user_id: alert.user_id, job_id: j.id, status: "bookmarked", updated_at: new Date().toISOString() },
              { onConflict: "user_id,job_id" },
            );
        } catch {
          // Non-critical — alert was already sent
        }
      }
    }

    await supabase
      .from("alerts")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", alert.id);
  }

  return NextResponse.json({
    success: true,
    sent: totalSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
