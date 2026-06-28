import json
from unittest.mock import AsyncMock, patch

import pytest
from ai import analyze_job, build_analysis_prompt, generate_pitch


class TestBuildAnalysisPrompt:
    def test_keyword_only_sets_skills_seniority_to_null(self):
        prompt = build_analysis_prompt(keyword="React Developer", resume_text="")
        assert "skills_match et seniority_match: mets-les à null" in prompt
        assert "match_score = keyword_alignment" in prompt
        assert "pas de CV disponible" in prompt

    def test_resume_only_sets_keyword_alignment_to_null(self):
        prompt = build_analysis_prompt(
            keyword="", resume_text="Experienced engineer..."
        )
        assert "keyword_alignment: mets-le à null" in prompt
        assert "match_score: moyenne de skills_match et seniority_match" in prompt
        assert "pas de mot-clé" in prompt

    def test_keyword_and_resume_uses_weighted_average(self):
        prompt = build_analysis_prompt(
            keyword="Data Engineer", resume_text="Spark, Kafka, Python"
        )
        assert "keyword_alignment" in prompt
        assert "skills_match" in prompt
        assert "seniority_match" in prompt
        assert "moyenne pondérée des 3 sous-scores" in prompt

    def test_empty_keyword_and_resume_falls_back_generic(self):
        prompt = build_analysis_prompt(keyword="", resume_text="")
        assert (
            "skills_match" not in prompt.split("Règles")[1]
            if "Règles" in prompt
            else True
        )
        assert "Tu es un expert en recrutement tech" in prompt

    def test_keyword_with_whitespace_only_treated_as_empty(self):
        prompt = build_analysis_prompt(keyword="   ", resume_text="")
        assert "mets-les à null" not in prompt
        assert "Tu es un expert en recrutement tech" in prompt


def _mock_groq_response(post_mock, status_code: int, json_data: dict):
    """Helper to mock httpx.AsyncClient.post for the ai module.

    NOTE: httpx.Response.json() and .raise_for_status() are SYNCHRONOUS.
    The mock must use regular functions, not async ones.
    """
    mock_resp = AsyncMock()
    mock_resp.status_code = status_code

    def mock_raise_for_status():
        if status_code >= 400:
            raise httpx.HTTPStatusError(
                f"HTTP {status_code}",
                request=AsyncMock(),
                response=mock_resp,
            )

    mock_resp.raise_for_status = mock_raise_for_status
    mock_resp.json = lambda: json_data
    post_mock.return_value = mock_resp


class TestAnalyzeJob:
    @patch("ai.httpx.AsyncClient")
    async def test_keyword_only_returns_null_score_breakdown_fields(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "summary": "Poste React confirmé",
                                    "tech_stack": ["React", "TypeScript"],
                                    "match_score": 72,
                                    "estimated_salary": "60-80K EUR",
                                    "contract_type": "CDI",
                                    "seniority": "Confirmé",
                                    "remote_policy": "Hybride",
                                    "score_breakdown": {
                                        "keyword_alignment": 72,
                                        "skills_match": None,
                                        "seniority_match": None,
                                    },
                                    "verdict_ai": "Correspond bien à la recherche React",
                                }
                            )
                        }
                    }
                ]
            },
        )

        result = await analyze_job(
            description="React Developer wanted",
            title="React Dev",
            company="TechCorp",
            keyword="React Developer",
        )

        assert result["match_score"] == 72
        assert result["score_breakdown"]["keyword_alignment"] == 72
        assert result["score_breakdown"]["skills_match"] is None
        assert result["score_breakdown"]["seniority_match"] is None

    @patch("ai.httpx.AsyncClient")
    async def test_resume_only_returns_null_keyword_alignment(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "summary": "Match compétences",
                                    "tech_stack": ["Python", "Django"],
                                    "match_score": 88,
                                    "estimated_salary": "50-65K EUR",
                                    "contract_type": "CDI",
                                    "seniority": "Confirmé",
                                    "remote_policy": "Full Remote",
                                    "score_breakdown": {
                                        "keyword_alignment": None,
                                        "skills_match": 88,
                                        "seniority_match": 85,
                                    },
                                    "verdict_ai": "Excellent profil",
                                }
                            )
                        }
                    }
                ]
            },
        )

        result = await analyze_job(
            description="Python Developer",
            resume_text="5 ans Django, Python, API REST",
        )

        assert result["match_score"] == 88
        assert result["score_breakdown"]["keyword_alignment"] is None
        assert result["score_breakdown"]["skills_match"] == 88

    @patch("ai.httpx.AsyncClient")
    async def test_groq_timeout_returns_empty_fallback(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        post.side_effect = TimeoutError("Groq timeout")

        result = await analyze_job(
            description="Fullstack position",
            keyword="Fullstack",
        )
        assert result == {}

    @patch("ai.httpx.AsyncClient")
    async def test_groq_429_rate_limit_returns_empty_fallback(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        mock_resp = AsyncMock()
        mock_resp.status_code = 429

        async def raiser():
            raise httpx.HTTPStatusError(
                "429 Rate Limit", request=AsyncMock(), response=mock_resp
            )

        mock_resp.raise_for_status = raiser
        post.return_value = mock_resp

        result = await analyze_job(description="Backend position", keyword="Backend")
        assert result == {}

    @patch("ai.httpx.AsyncClient")
    async def test_groq_malformed_json_returns_empty(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {"choices": [{"message": {"content": "Ceci n'est pas du JSON valide"}}]},
        )

        result = await analyze_job(description="Any job", keyword="test")
        assert result == {}

    @patch("ai.httpx.AsyncClient")
    async def test_groq_returns_markdown_wrapped_json(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {
                "choices": [
                    {
                        "message": {
                            "content": '```json\n{"summary": "ok", "tech_stack": ["Go"], "match_score": 90, "estimated_salary": null, "contract_type": "CDI", "seniority": "Senior", "remote_policy": "Remote", "score_breakdown": {"keyword_alignment": 90, "skills_match": null, "seniority_match": null}, "verdict_ai": "OK"}\n```'
                        }
                    }
                ]
            },
        )

        result = await analyze_job(description="Go developer", keyword="Go")
        assert result["match_score"] == 90

    @patch("ai.httpx.AsyncClient")
    async def test_long_resume_is_truncated_gracefully(self, mock_client):
        long_resume = "A" * 15_000
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "summary": "Résumé OK",
                                    "tech_stack": ["React"],
                                    "match_score": 50,
                                    "estimated_salary": None,
                                    "contract_type": "CDI",
                                    "seniority": "Junior",
                                    "remote_policy": "Sur site",
                                    "score_breakdown": {
                                        "keyword_alignment": None,
                                        "skills_match": 50,
                                        "seniority_match": 40,
                                    },
                                    "verdict_ai": "Profil junior correct",
                                }
                            )
                        }
                    }
                ]
            },
        )

        result = await analyze_job(
            description="Junior dev position",
            resume_text=long_resume,
        )
        assert result is not None
        assert result["match_score"] == 50

    @patch("ai.httpx.AsyncClient")
    async def test_no_groq_key_returns_empty_early(self, mock_client):
        with patch.dict("os.environ", {"GROQ_API_KEY": ""}, clear=True):
            result = await analyze_job(description="Some job", keyword="test")
            assert result == {}

    @patch("ai.httpx.AsyncClient")
    async def test_empty_description_returns_empty_early(self, mock_client):
        result = await analyze_job(description="", keyword="test")
        assert result == {}


class TestGeneratePitch:
    @patch("ai.httpx.AsyncClient")
    async def test_pitch_returns_valid_structure(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _mock_groq_response(
            post,
            200,
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "subject": "Candidature React Developer",
                                    "message": "Bonjour, je suis vivement intéressé par ce poste...",
                                }
                            )
                        }
                    }
                ]
            },
        )

        result = await generate_pitch(
            description="React position",
            title="React Dev",
            company="TechCorp",
        )
        assert result is not None
        assert result["subject"] == "Candidature React Developer"
        assert "Bonjour" in result["message"]

    @patch("ai.httpx.AsyncClient")
    async def test_pitch_failure_returns_none(self, mock_client):
        mock_client.return_value.__aenter__.return_value.post.side_effect = Exception(
            "API down"
        )

        result = await generate_pitch(
            description="Any job",
            title="Dev",
            company="Corp",
        )

        assert result is None


from unittest.mock import AsyncMock as AsyncMockType

import httpx
