pub fn check_domain_coherence(job_title: &str, job_description: &str, search_keyword: &str) -> bool {
    let title_lower = job_title.to_lowercase();
    let desc_lower = job_description.to_lowercase();
    let keyword_lower = search_keyword.to_lowercase();

    // 1. Si le mot-clé est dans le titre, la cohérence de base est très forte
    if title_lower.contains(&keyword_lower) {
        return true;
    }

    // 2. Si le premier mot du mot-clé (ex: "Rust" dans "Rust Europe") 
    // n'est NI dans le titre NI dans la description, c'est probablement un faux positif de l'API.
    if let Some(first_word) = keyword_lower.split_whitespace().next() {
        if first_word.len() > 2 && !title_lower.contains(first_word) && !desc_lower.contains(first_word) {
            return false;
        }
    }

    // 3. Gestion des exclusions croisées par domaine
    // Si l'utilisateur cherche du Design, on exclut le Dev pur, et inversement.
    let is_design_search = keyword_lower.contains("design") || keyword_lower.contains("ux") || keyword_lower.contains("ui");
    let is_dev_search = keyword_lower.contains("dev") || keyword_lower.contains("engineer") || keyword_lower.contains("code");

    if is_design_search {
        let design_blacklist = vec!["backend", "devops", "sysadmin", "comptable", "sales", "boulanger"];
        for word in design_blacklist {
            if title_lower.contains(word) {
                return false; // Élimine un "Dev Backend" qui s'est glissé dans la recherche Design
            }
        }
    }

    if is_dev_search {
        let dev_blacklist = vec!["graphiste", "infographiste", "commercial", "rh", "recruteur"];
        for word in dev_blacklist {
            if title_lower.contains(word) {
                return false;
            }
        }
    }

    true
}
