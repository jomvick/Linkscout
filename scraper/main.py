import asyncio
import json
import logging
import os
from typing import Any, Optional

from ai import analyze_job, generate_pitch
from dorker import search_jobs
from dotenv import load_dotenv
from enrich import enrich_job
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from guest_scraper import scrape_job_detail
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="LinkScout Scraper")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

CONCURRENCY = 3
sem = asyncio.Semaphore(CONCURRENCY)


class ScrapeRequest(BaseModel):
    keyword: str
    limit: int = 10


class ScrapeResponse(BaseModel):
    success: bool
    keyword: str
    jobs: list[dict[str, Any]]
    error: Optional[str] = None


class AnalyzeRequest(BaseModel):
    title: str = ""
    company: str = ""
    description: str
    keyword: str = ""
    resume_text: str = ""


class PitchRequest(BaseModel):
    title: str = ""
    company: str = ""
    description: str


async def _process_one(entry: dict[str, Any], keyword: str) -> Optional[dict[str, Any]]:
    async with sem:
        detail = await scrape_job_detail(entry["url"], entry)
        if not detail or not detail.get("title"):
            return None
        job = {
            **detail,
            "source": "linkedin_guest",
            "keyword": keyword,
            "status": "new",
        }
        return await enrich_job(job)

async def _fetch_source_and_process(source_func, keyword: str, limit: int, q: asyncio.Queue):
    try:
        listings = await source_func(keyword, limit=limit)
        if source_func.__name__ == "search_jobs":
            tasks = [_process_one(entry, keyword) for entry in listings]
            for coro in asyncio.as_completed(tasks):
                try:
                    job = await coro
                    if job:
                        await q.put(job)
                except Exception:
                    logger.exception("Failed to process one scraped listing")
        else:
            tasks = [enrich_job(entry) for entry in listings]
            for coro in asyncio.as_completed(tasks):
                try:
                    job = await coro
                    if job:
                        await q.put(job)
                except Exception:
                    logger.exception("Failed to enrich one listing")
    except Exception:
        logger.exception(f"Source fetch failed for {source_func.__name__}")

async def _job_generator(keyword: str, limit: int):
    from dorker import search_jobs
    from wttj_scraper import search_wttj
    from indeed_scraper import search_indeed

    q = asyncio.Queue()
    
    # Send a meta event to initialize the frontend state
    yield json.dumps({"type": "meta", "total": limit * 3}) + "\n"

    tasks = [
        asyncio.create_task(_fetch_source_and_process(search_jobs, keyword, limit, q)),
        asyncio.create_task(_fetch_source_and_process(search_indeed, keyword, limit, q)),
        asyncio.create_task(_fetch_source_and_process(search_wttj, keyword, limit, q)),
    ]

    async def _wait_all():
        await asyncio.gather(*tasks, return_exceptions=True)
        await q.put(None)
        
    asyncio.create_task(_wait_all())

    while True:
        job = await q.get()
        if job is None:
            break
        yield json.dumps({"type": "job", "data": job}) + "\n"

    yield json.dumps({"type": "done"}) + "\n"


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest):
    jobs: list[dict[str, Any]] = []
    try:
        async for line in _job_generator(req.keyword, req.limit):
            event = json.loads(line)
            if event["type"] == "job":
                jobs.append(event["data"])
        return ScrapeResponse(success=True, keyword=req.keyword, jobs=jobs)
    except Exception:
        logger.exception("Scrape request failed")
        return ScrapeResponse(
            success=False,
            keyword=req.keyword,
            jobs=jobs,
            error="Scrape failed",
        )


@app.post("/scrape-stream")
async def scrape_stream(req: ScrapeRequest):
    return StreamingResponse(
        _job_generator(req.keyword, req.limit),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    result = await analyze_job(
        description=req.description,
        title=req.title,
        company=req.company,
        keyword=req.keyword,
        resume_text=req.resume_text,
    )
    if not result:
        raise HTTPException(status_code=502, detail="AI analysis failed")
    return {"success": True, "analysis": result}


@app.post("/message")
async def message(req: PitchRequest):
    result = await generate_pitch(
        description=req.description,
        title=req.title,
        company=req.company,
    )
    if not result:
        raise HTTPException(status_code=502, detail="AI message generation failed")
    return {"success": True, "pitch": result}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("SCRAPER_HOST", "0.0.0.0")
    port = int(os.getenv("SCRAPER_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
