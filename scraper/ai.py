"""
Pipeline IA via Groq API — analyse, match score, résumé, accroche.
Modèle: llama-3.3-70b-versatile (équilibre qualité/vitesse)
Scoring adaptatif: mot-clé seul / CV seul / mot-clé + CV.
"""

import json
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"


def build_analysis_prompt(keyword: str = "", resume_text: str = "") -> str:
    has_keyword = bool(keyword and keyword.strip())
    has_resume = bool(resume_text and resume_text.strip())

    prompt = """Tu es un expert en recrutement tech. Analyse l'offre d'emploi fournie.

Retourne STRICTEMENT un JSON valide (pas de markdown, pas de texte autour) :
{
  "summary": "résumé en 3 puces max (mission, stack, points forts)",
  "tech_stack": ["techno1", "techno2"],
  "match_score": 0-100,
  "estimated_salary": "estimation fourchette TJM ou salaire en EUR",
  "contract_type": "CDI | Freelance | Stage | Alternance | CDD | Non spécifié",
  "seniority": "Junior | Confirmé | Senior | Lead | Non spécifié",
  "remote_policy": "Full Remote | Hybride | Sur site | Non spécifié",
  "score_breakdown": {
    "keyword_alignment": 0-100,
    "skills_match": null,
    "seniority_match": null
  },
  "verdict_ai": "phrase courte d'analyse contextuelle"
}

Règles match_score:
- match_score: score global (moyenne pondérée des sous-scores disponibles)
- score_breakdown.keyword_alignment: pertinence de l'offre par rapport à l'intention de recherche"""

    if has_keyword and not has_resume:
        prompt += f"""
Contexte: L'utilisateur cherche via le mot-clé '{keyword}'.
- keyword_alignment: évalue la pertinence par rapport à ce mot-clé
- skills_match et seniority_match: mets-les à null (pas de CV disponible)
- match_score = keyword_alignment
- verdict_ai: évalue si l'offre correspond bien à la recherche effectuée"""

    elif has_resume and not has_keyword:
        prompt += """
Contexte: L'utilisateur a partagé son CV. Aucun mot-clé de recherche spécifique.
- keyword_alignment: mets-le à null (pas de mot-clé)
- skills_match: évalue l'adéquation pure des compétences techniques du CV avec celles requises par l'offre
- seniority_match: évalue si le niveau d'expérience du CV correspond au poste
- match_score: moyenne de skills_match et seniority_match
- verdict_ai: analyse personnalisée basée sur le profil CV"""

    elif has_keyword and has_resume:
        prompt += f"""
Contexte: L'utilisateur cherche '{keyword}' et a partagé son CV.
- keyword_alignment: pertinence de l'offre par rapport au mot-clé
- skills_match: adéquation des compétences CV avec l'offre
- seniority_match: adéquation du niveau d'expérience CV avec le poste
- match_score: moyenne pondérée des 3 sous-scores
- verdict_ai: analyse complète mêlant intention de recherche et profil"""

    return prompt


PITCH_PROMPT = """Tu rédiges un message de candidature spontanée percutant et personnalisé pour l'offre suivante.
Retourne UNIQUEMENT un JSON valide :
{
  "subject": "objet du message (max 80 car.)",
  "message": "corps du message (4-5 phrases max, ton pro mais pas trop formel, en français)"
}
"""


async def analyze_job(
    description: str,
    title: str = "",
    company: str = "",
    keyword: str = "",
    resume_text: str = "",
) -> dict[str, Any]:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or not description:
        return {}

    text = (
        f"Titre: {title}\nEntreprise: {company}\n\nDescription:\n{description[:4000]}"
    )
    if resume_text:
        text += f"\n\nCV du candidat:\n{resume_text[:2000]}"

    prompt = build_analysis_prompt(keyword, resume_text)

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": text},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            content = (
                content.removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            result = json.loads(content)
            return {
                "summary": result.get("summary"),
                "tech_stack": result.get("tech_stack"),
                "match_score": result.get("match_score"),
                "estimated_salary": result.get("estimated_salary"),
                "contract_type": result.get("contract_type"),
                "seniority": result.get("seniority"),
                "remote_policy": result.get("remote_policy"),
                "score_breakdown": result.get("score_breakdown"),
                "verdict_ai": result.get("verdict_ai"),
            }
    except Exception as e:
        logger.error("Groq analyze_job failed: %s", e, exc_info=True)
        return {}


async def generate_pitch(
    description: str, title: str = "", company: str = ""
) -> Optional[dict[str, Any]]:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or not description:
        return None

    text = (
        f"Titre: {title}\nEntreprise: {company}\n\nDescription:\n{description[:3000]}"
    )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": PITCH_PROMPT},
                        {"role": "user", "content": text},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                    "max_tokens": 512,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            content = (
                content.removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            return json.loads(content)
    except Exception as e:
        logger.error("Groq generate_pitch failed: %s", e, exc_info=True)
        return None
