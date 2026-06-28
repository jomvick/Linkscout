"""
Discord webhook notifications for high-match job opportunities.
Sends rich embeds color-coded by match_score.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")


def _embed_color(score: int) -> int:
    """Green 90%+, amber 70-89%, blue below."""
    if score >= 90:
        return 0x10B981
    if score >= 70:
        return 0xF59E0B
    return 0x0A66C2


async def notify_discord(job: dict) -> bool:
    """Send a rich embed to Discord. Returns True if sent successfully."""
    if not DISCORD_WEBHOOK_URL:
        return False

    score = job.get("match_score")
    if score is None:
        return False

    title = job.get("title", "Offre sans titre")
    company = job.get("company", "Entreprise inconnue")
    location = job.get("location", "Non spécifié")
    salary = job.get("estimated_salary") or job.get("salary") or "Non spécifié"
    url = job.get("url", "")
    tech_stack = job.get("tech_stack") or []

    fields = [
        {"name": "🏢 Entreprise", "value": company, "inline": True},
        {"name": "📍 Lieu", "value": location, "inline": True},
        {"name": "🎯 Match Score", "value": f"**{score}%**", "inline": True},
        {"name": "💰 Salaire / TJM", "value": salary, "inline": True},
    ]

    if tech_stack:
        fields.append({
            "name": "🛠 Stack",
            "value": ", ".join(tech_stack[:10]),
            "inline": False,
        })

    embed = {
        "title": f"🔥 {title}",
        "url": url or None,
        "color": _embed_color(score),
        "fields": fields,
        "footer": {"text": "LinkScout • Alerte opportunité"},
    }

    # Add thumbnail if logo available
    logo = job.get("logo_url")
    if logo:
        embed["thumbnail"] = {"url": logo}

    payload = {
        "username": "LinkScout",
        "embeds": [embed],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(DISCORD_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
            logger.info("Discord notification sent for: %s @ %s (score=%s)", title, company, score)
            return True
    except Exception as e:
        logger.warning("Discord notification failed: %s", e)
        return False
