"""
Discovery — recherche d'offres LinkedIn via l'API publique guest.
Sans auth, sans session, sans risque.
"""

import asyncio
import random
import re
from typing import Any, Optional

import httpx
from utils import USER_AGENTS

LINKEDIN_GUEST_API = (
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
)


def extract_job_id(url_or_id: str) -> Optional[str]:
    m = re.search(r"/jobs/view/.+-(\d+)(?:\?|$)", url_or_id)
    if m:
        return m.group(1)
    m = re.search(r"/jobs/view/(\d+)", url_or_id)
    if m:
        return m.group(1)
    if url_or_id.strip().isdigit():
        return url_or_id.strip()
    return None


async def search_jobs(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }

    params = {
        "keywords": keyword,
        "location": "",
        "start": 0,
        "count": min(limit, 25),
    }

    await asyncio.sleep(random.uniform(0.2, 1.0))
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(LINKEDIN_GUEST_API, params=params, headers=headers)

    if resp.status_code != 200:
        return []

    return parse_job_cards(resp.text, keyword)


def parse_job_cards(html: str, keyword: str) -> list[dict[str, Any]]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    results = []

    for card in soup.select(".job-search-card"):
        link_tag = card.select_one("a.base-card__full-link")
        if not link_tag:
            continue

        href_attr = link_tag.get("href")
        href = href_attr if isinstance(href_attr, str) else ""
        if "/jobs/view/" not in href:
            continue

        title_tag = card.select_one(".base-search-card__title")
        company_tag = card.select_one(".base-search-card__subtitle")
        location_tag = card.select_one(".job-search-card__location")

        title = title_tag.get_text(strip=True) if title_tag else ""
        company = company_tag.get_text(strip=True) if company_tag else ""
        location = location_tag.get_text(strip=True) if location_tag else ""

        if not title or not company:
            continue

        url = href.split("?")[0]

        results.append(
            {
                "url": url,
                "title": title,
                "company": company,
                "location": location,
                "source": "linkedin_guest",
                "keyword": keyword,
            }
        )

    return results[:25]
