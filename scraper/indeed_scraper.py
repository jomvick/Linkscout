import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

async def search_indeed(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Recherche des offres sur Indeed via Apify.
    """
    apify_token = os.getenv("APIFY_TOKEN") or os.getenv("APIFY_API_TOKEN")
    actor_id = os.getenv("APIFY_ACTOR_INDEED", "apify/indeed-scraper")
    
    if not apify_token or not actor_id:
        logger.error("APIFY_TOKEN ou APIFY_INDEED_ACTOR_ID manquant pour Indeed.")
        return []
        
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    params = {"token": apify_token}
    payload = {
        "position": keyword,
        "country": "FR",
        "maxItems": limit
    }
    
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, params=params, json=payload)
            
        if resp.status_code != 200:
            logger.error(f"Apify Indeed error: {resp.text}")
            return []
            
        data = resp.json()
        results = []
        for item in data[:limit]:
            results.append({
                "url": item.get("url", ""),
                "title": item.get("positionName", "") or item.get("title", ""),
                "company": item.get("company", ""),
                "location": item.get("location", ""),
                "source": "indeed",
                "keyword": keyword,
                "contract_type": item.get("jobType", ""),
            })
        return results
    except Exception as e:
        logger.exception("Error searching Indeed via Apify")
        return []
