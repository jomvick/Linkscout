/// Construit le prompt système pour l'analyse d'offre.
/// Le prompt s'adapte selon qu'un mot-clé et/ou un CV sont fournis.
pub fn build_analysis_prompt(keyword: &str, resume_text: &str) -> String {
    let has_keyword = !keyword.trim().is_empty();
    let has_resume = !resume_text.trim().is_empty();

    let mut prompt = r#"Tu es un expert en recrutement tech. Analyse l'offre d'emploi fournie.

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
  "score_coherence_generale": 0-100,
  "score_coherence_cv": null,
  "verdict_ai": "phrase courte d'analyse contextuelle"
}

Règles match_score:
- match_score: score global (moyenne pondérée des sous-scores disponibles)
- score_breakdown.keyword_alignment: pertinence de l'offre par rapport à l'intention de recherche"#.to_string();

    match (has_keyword, has_resume) {
        (true, false) => {
            prompt.push_str(&format!("\n\nContexte: L'utilisateur cherche via le mot-clé '{}'.\n- keyword_alignment: évalue la pertinence par rapport à ce mot-clé\n- skills_match et seniority_match: mets-les à null (pas de CV disponible)\n- match_score = keyword_alignment\n- score_coherence_generale: adéquation générale du poste (marché, séniorité, salaire)\n- score_coherence_cv: null (pas de CV)\n- verdict_ai: évalue si l'offre correspond bien à la recherche effectuée", keyword));
        }
        (false, true) => {
            prompt.push_str("\n\nContexte: L'utilisateur a partagé son CV. Aucun mot-clé de recherche spécifique.\n- keyword_alignment: mets-le à null (pas de mot-clé)\n- skills_match: évalue l'adéquation pure des compétences techniques du CV avec celles requises par l'offre\n- seniority_match: évalue si le niveau d'expérience du CV correspond au poste\n- match_score: moyenne de skills_match et seniority_match\n- score_coherence_generale: adéquation générale du poste (marché, séniorité, salaire)\n- score_coherence_cv: adéquation du CV avec les exigences spécifiques de l'offre\n- verdict_ai: analyse personnalisée basée sur le profil CV");
        }
        (true, true) => {
            prompt.push_str(&format!("\n\nContexte: L'utilisateur cherche '{}' et a partagé son CV.\n- keyword_alignment: pertinence de l'offre par rapport au mot-clé\n- skills_match: adéquation des compétences CV avec l'offre\n- seniority_match: adéquation du niveau d'expérience CV avec le poste\n- match_score: moyenne pondérée des 3 sous-scores\n- score_coherence_generale: adéquation générale du poste (marché, séniorité, salaire)\n- score_coherence_cv: adéquation du CV avec les exigences spécifiques de l'offre\n- verdict_ai: analyse complète mêlant intention de recherche et profil", keyword));
        }
        (false, false) => {
            prompt.push_str("\n\nContexte: Aucun CV ni mot-clé disponible.\n- keyword_alignment, skills_match, seniority_match: mets-les à null\n- match_score: null\n- score_coherence_generale: adéquation générale du poste (marché, séniorité, salaire)\n- score_coherence_cv: null (pas de CV)\n- verdict_ai: donne un avis neutre sur l'offre");
        }
    }

    prompt
}

pub const PITCH_PROMPT: &str = r#"Tu rédiges un message de candidature spontanée percutant et personnalisé pour l'offre suivante.
Retourne UNIQUEMENT un JSON valide :
{
  "subject": "objet du message (max 80 car.)",
  "message": "corps du message (4-5 phrases max, ton pro mais pas trop formel, en français)"
}"#;

pub const Q_AND_A_PROMPT: &str = r#"Tu es un assistant carrière spécialisé dans l'analyse d'offres d'emploi.
L'utilisateur te pose une question sur l'offre ci-dessous.
Réponds de manière concise et utile, en t'appuyant sur les détails de l'offre.

Retourne STRICTEMENT un JSON valide (pas de markdown, pas de texte autour) :
{
  "answer": "ta réponse à la question de l'utilisateur (3-4 phrases max, en français)"
}"#;
