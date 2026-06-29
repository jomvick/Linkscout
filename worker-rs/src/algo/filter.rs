use chrono::{Utc, Duration};
use regex::Regex;
use crate::models::job::RawJob;

pub fn is_valid_and_available(job: &RawJob) -> bool {
    // 1. CRITÈRE DE TEMPS : Éliminer les offres de plus de 30 jours
    if let Some(date) = job.posted_at {
        let thirty_days_ago = Utc::now() - Duration::try_days(30).unwrap_or_else(|| Duration::days(30));
        if date < thirty_days_ago {
            return false; // Trop vieux
        }
    }

    // 2. CRITÈRE DE DISPONIBILITÉ : Détecter les mots-clés d'expiration dans la description
    let expired_signals = vec![
        r"(?i)recrutement clos", 
        r"(?i)offre expirée", 
        r"(?i)poste pourvu", 
        r"(?i)candidature.*terminée"
    ];

    for pattern in expired_signals {
        let re = Regex::new(pattern).unwrap();
        if re.is_match(&job.description) {
            return false; // L'offre mentionne elle-même qu'elle est fermée
        }
    }

    true
}
