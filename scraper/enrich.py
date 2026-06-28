"""
Enrichissement logos — via unavatar.io.

Clearbit logo.clearbit.com est mort (DNS désactivé, rachat HubSpot 2024).
On génère des URLs unavatar.io : le service agrège Twitter, GitHub,
DuckDuckGo et d'autres sources. Aucun appel HTTP n'est fait ici —
la résolution se fait côté navigateur, ce qui est plus rapide et fiable.
"""

import asyncio
import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

LEGAL_SUFFIXES = re.compile(
    r",?\s*(inc\.?|incorp(?:orated)?|llc|ltd\.?|limited|corp\.?|corporation|gmbh|ag|sa|sas|sarl|plc|pty\.?\s*ltd\.?|llp|co\.?|company|group|holdings?|technologies|solutions)\s*\.?\s*$",
    re.IGNORECASE,
)

# TLDs tentés dans l'ordre de probabilité
CANDIDATE_TLDS = ["com", "io", "ai", "co", "net"]


def clean_company_name(name: str | None) -> str:
    if not name:
        return ""
    cleaned = LEGAL_SUFFIXES.sub("", name).strip()
    cleaned = re.sub(r"[^\w\s]", "", cleaned).strip()
    return cleaned or name.strip()


def company_slug(company_name: str) -> str:
    """Génère un slug alphanumérique à partir du nom d'entreprise."""
    cleaned = clean_company_name(company_name)
    return re.sub(r"[^a-z0-9]", "", cleaned.lower())


def make_logo_url(company_name: str, tld: str = "com") -> Optional[str]:
    """
    Génère une URL unavatar.io pour le logo de l'entreprise.
    - Aucun appel HTTP — génération instantanée.
    - unavatar.io retourne 200 si le logo est trouvé, 404 sinon
      (avec ?fallback=false), ce qui déclenche onError côté navigateur.
    """
    slug = company_slug(company_name)
    if not slug:
        return None
    return f"https://unavatar.io/{slug}.{tld}?fallback=false"


async def fetch_logo(company_name: str) -> Optional[str]:
    """
    Retourne l'URL du logo (unavatar .com par défaut).
    Conservé async pour compatibilité avec les callers existants.
    """
    return make_logo_url(company_name, tld="com")


async def enrich_job(job: dict[str, Any]) -> dict[str, Any]:
    company = job.get("company", "")
    job["logo_url"] = await fetch_logo(company)
    return job


async def enrich_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks = [enrich_job(j) for j in jobs]
    return await asyncio.gather(*tasks)
