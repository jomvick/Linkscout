"""
Guest Scraper — récupère la description complète d'une offre LinkedIn sans auth.
"""

import asyncio
import random
import re
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup
from utils import USER_AGENTS

# Marqueurs de fin de description — tout ce qui suit est du boilerplate
BOILERPLATE_MARKERS = re.compile(
    r"(about the company|a propos de l'entreprise|"
    r"equal opportunity employer|"
    r"processus de recrutement|recruitment process|"
    r"talent community|join our talent|"
    r"nous recrutons[^a-z])",  # dernier marqueur => on coupe
    re.IGNORECASE,
)

# Lignes de boilerplate à supprimer (séparateurs, follow us, etc.)
BOILERPLATE_LINES = re.compile(
    r"^\s*("
    r"─{3,}"
    r"|={3,}"
    r"|linkedin"
    r")\s*$",
    re.IGNORECASE,
)


async def fetch_job_page(url: str) -> Optional[str]:
    ua = random.choice(USER_AGENTS)
    headers = {"User-Agent": ua, "Accept-Language": "fr-FR,fr;q=0.9"}
    await asyncio.sleep(random.uniform(0.1, 0.5))
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            return resp.text
    return None


def trim_description(raw: str) -> str:
    """Supprime le boilerplate des descriptions LinkedIn pour réduire les tokens."""
    if not raw:
        return ""

    # Supprime les lignes de boilerplate
    lines = raw.split("\n")
    cleaned = [l for l in lines if not BOILERPLATE_LINES.match(l)]

    # Rejoint et coupe au premier marqueur de fin
    text = "\n".join(cleaned)
    text = BOILERPLATE_MARKERS.split(text, maxsplit=1)[0]

    # Nettoie les espaces
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def parse_description(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    desc_container = soup.find("div", class_=re.compile(r"description__text"))
    if not desc_container:
        return ""
    for unwanted in desc_container.find_all(["button", "script", "style"]):
        unwanted.decompose()
    raw = desc_container.get_text("\n", strip=True)
    return trim_description(raw)


def parse_detail(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")

    title_tag = soup.find(
        "h1", class_=re.compile(r"top-card-layout__title")
    ) or soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else ""

    company_tag = soup.find(
        "a", class_=re.compile(r"topcard__org-name-link")
    ) or soup.find("span", class_=re.compile(r"topcard__flavor"))
    company = company_tag.get_text(strip=True) if company_tag else ""

    location_tag = soup.find("span", class_=re.compile(r"topcard__flavor--bullet"))
    location = location_tag.get_text(strip=True) if location_tag else ""

    description = parse_description(html)

    return {
        "title": title or "",
        "company": company or "",
        "location": location or "",
        "description": description,
    }


async def scrape_job_detail(url: str, base: dict[str, Any]) -> Optional[dict[str, Any]]:
    html = await fetch_job_page(url)
    if not html:
        return None

    detail = parse_detail(html)
    if not detail.get("title"):
        detail["title"] = base.get("title", "")
    if not detail.get("company"):
        detail["company"] = base.get("company", "")
    if not detail.get("location"):
        detail["location"] = base.get("location", "")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "title": detail["title"],
        "company": detail["company"],
        "location": detail["location"],
        "description": detail.get("description", ""),
        "url": url,
        "created_at": now,
    }
