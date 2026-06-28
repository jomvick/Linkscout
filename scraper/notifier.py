import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
# Telegram bot tokens sont stockés par-alerte dans Supabase (format token|||chat_id)


def _embed_color(score: int) -> int:
    if score >= 90:
        return 0x10B981
    if score >= 70:
        return 0xF59E0B
    return 0x0A66C2


async def send_discord(webhook_url: str, job: dict[str, Any]) -> bool:
    score = job.get("match_score", 0)
    fields = [
        {"name": "Entreprise", "value": job.get("company", "N/A"), "inline": True},
        {"name": "Lieu", "value": job.get("location", "Non spécifié"), "inline": True},
        {"name": "Match Score", "value": f"**{score}%**", "inline": True},
        {
            "name": "Salaire / TJM",
            "value": job.get("salary") or job.get("estimated_salary") or "Non spécifié",
            "inline": True,
        },
    ]
    tech = job.get("tech_stack")
    if tech:
        fields.append({"name": "Stack", "value": ", ".join(tech[:10]), "inline": False})

    embed = {
        "title": f"🚀 {job.get('title', 'Offre sans titre')}",
        "url": job.get("url") or None,
        "color": _embed_color(score),
        "fields": fields,
        "footer": {"text": "LinkScout — Job Intelligence"},
    }
    if job.get("logo_url"):
        embed["thumbnail"] = {"url": job["logo_url"]}

    payload = {"username": "LinkScout", "embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            resp.raise_for_status()
            logger.info("Discord sent: %s @ %s", job.get("title"), job.get("company"))
            return True
    except Exception as e:
        logger.warning("Discord failed: %s", e)
        return False


async def send_telegram(bot_token: str, chat_id: str, job: dict[str, Any]) -> bool:
    score = job.get("match_score", "N/A")
    salary = job.get("salary") or job.get("estimated_salary") or "Non spécifié"
    tech = job.get("tech_stack")
    tech_str = f"\n🛠 Stack: {', '.join(tech[:6])}" if tech else ""

    text = (
        f"<b>🚀 Nouvelle opportunité détectée !</b>\n\n"
        f"🎯 <b>Poste :</b> {job.get('title', 'N/A')}\n"
        f"🏢 <b>Entreprise :</b> {job.get('company', 'N/A')}\n"
        f"📍 <b>Lieu :</b> {job.get('location', 'N/A')}\n"
        f"🔥 <b>Match Score :</b> {score}%\n"
        f"💰 <b>Salaire :</b> {salary}{tech_str}\n\n"
        f"🔗 <a href='{job.get('url', '#')}'>Voir l'offre sur LinkedIn</a>"
    )

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info("Telegram sent: %s @ %s", job.get("title"), job.get("company"))
            return True
    except Exception as e:
        logger.warning("Telegram failed: %s", e)
        return False


async def auto_add_collection(user_id: str, job_id: str) -> bool:
    """Appelle l'API Next.js pour ajouter automatiquement un job à la collection de l'utilisateur."""
    if not INTERNAL_API_KEY or not NEXTJS_API_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{NEXTJS_API_URL}/api/collection/auto-add",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": INTERNAL_API_KEY,
                },
                json={"userId": user_id, "jobId": job_id},
            )
            return resp.is_success
    except Exception as e:
        logger.warning("Auto-add collection failed: %s", e)
        return False


async def notify_alert(alert: dict[str, Any], job: dict[str, Any]) -> bool:
    platform = alert.get("platform")
    webhook_url = alert.get("webhook_url")
    sent = False

    if not webhook_url or not isinstance(webhook_url, str):
        logger.warning("Alert %s has no valid webhook_url", alert.get("id"))
        return False

    if platform == "discord":
        sent = await send_discord(webhook_url, job)
    elif platform == "telegram":
        parts = webhook_url.split("|||")
        if len(parts) != 2:
            logger.warning("Invalid Telegram payload format")
            return False
        bot_token, chat_id = parts[0].strip(), parts[1].strip()
        sent = await send_telegram(bot_token, chat_id, job)
    else:
        logger.warning("Unknown platform: %s", platform)
        return False

    # Auto-add high-score jobs to the user's collection
    user_id = alert.get("user_id")
    job_id = job.get("id")
    score = job.get("match_score", 0) or 0
    if sent and user_id and job_id and score >= 80:
        asyncio.create_task(auto_add_collection(user_id, job_id))

    return sent
