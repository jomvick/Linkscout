import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

async def search_wttj(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Recherche des offres sur Welcome to the Jungle via Apify.
    """
    apify_token = os.getenv("APIFY_TOKEN") or os.getenv("APIFY_API_TOKEN")
    actor_id = os.getenv("APIFY_ACTOR_WTTJ", "glenn/welcome-to-the-jungle-scraper")
    
    if not apify_token or not actor_id:
        logger.error("APIFY_TOKEN ou APIFY_WTTJ_ACTOR_ID manquant pour WTTJ.")
        return []
        
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
    params = {"token": apify_token}
    payload = {
        "searchQuery": keyword,
        "maxItems": limit
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, params=params, json=payload)
            
        if resp.status_code != 200:
            logger.error(f"Apify WTTJ error: {resp.text}")
            return []
            
        data = resp.json()
        results = []
        for item in data[:limit]:
            results.append({
                "url": item.get("url", ""),
                "title": item.get("title", ""),
                "company": item.get("company", ""),
                "location": item.get("location", ""),
                "source": "wttj",
                "keyword": keyword,
                "contract_type": item.get("contractType", ""),
            })
        return results
    except Exception as e:
        logger.exception("Error searching WTTJ via Apify")
        return []
