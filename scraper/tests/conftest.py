import asyncio
import os
from typing import AsyncGenerator
import pytest
import httpx

TEST_GROQ_KEY = "gsk_test_fake_key_for_tests"


@pytest.fixture(autouse=True)
def mock_env():
    os.environ.setdefault("GROQ_API_KEY", TEST_GROQ_KEY)
    os.environ.setdefault("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/test/000")
    yield


@pytest.fixture
def sample_job() -> dict:
    return {
        "id": "job-001",
        "title": "Senior React Developer",
        "company": "TechCorp",
        "description": (
            "We are looking for a Senior React Developer with 5+ years of experience "
            "in TypeScript, Next.js, and GraphQL. The ideal candidate has strong "
            "knowledge of state management and testing."
        ),
        "url": "https://linkedin.com/jobs/view/001",
        "location": "Paris, France",
        "source": "linkedin_guest",
        "status": "new",
        "match_score": 85,
        "tech_stack": ["React", "TypeScript", "Next.js", "GraphQL"],
        "estimated_salary": "70-90K EUR",
        "contract_type": "CDI",
    }


@pytest.fixture
def sample_job_no_score() -> dict:
    job = {
        "id": "job-002",
        "title": "Junior Python Developer",
        "company": "StartupABC",
        "description": "Entry-level Python position.",
        "url": None,
        "location": None,
        "source": "linkedin_guest",
        "status": "new",
        "match_score": None,
        "tech_stack": None,
        "estimated_salary": None,
        "contract_type": None,
    }
    return job


@pytest.fixture
def telegram_webhook() -> str:
    return "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11|||-100123456789"


@pytest.fixture
def discord_webhook() -> str:
    return "https://discord.com/api/webhooks/123456/abc-def-ghi"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
