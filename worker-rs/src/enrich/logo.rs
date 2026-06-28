use regex::Regex;
use std::sync::LazyLock;

static LEGAL_SUFFIXES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i),?\s*(inc\.?|incorp(?:orated)?|llc|ltd\.?|limited|corp\.?|corporation|gmbh|ag|sa|sas|sarl|plc|pty\.?\s*ltd\.?|llp|co\.?|company|group|holdings?|technologies|solutions)\s*\.?\s*$",
    )
    .unwrap()
});

/// Génère l'URL unavatar.io pour le logo de l'entreprise.
/// Aucun appel HTTP — simple génération d'URL.
pub fn make_logo_url(company_name: &str) -> Option<String> {
    let cleaned = LEGAL_SUFFIXES
        .replace(company_name, "")
        .trim()
        .to_string();
    let slug: String = cleaned.chars().filter(|c| c.is_alphanumeric()).collect();
    if slug.is_empty() {
        return None;
    }
    Some(format!("https://unavatar.io/{}.com?fallback=false", slug.to_lowercase()))
}
