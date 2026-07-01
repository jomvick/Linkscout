export interface ScoreBreakdown {
  keyword_alignment: number | null;
  skills_match: number | null;
  seniority_match: number | null;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string | null;
  url: string | null;
  source: string;
  status: "new" | "enriched" | "archived";
  created_at: string;
  logo_url: string | null;
  match_score: number | null;
  summary: string | null;
  tech_stack: string[] | null;
  salary: string | null;
  location: string | null;
  contract_type: string | null;
  remote_policy: string | null;
  seniority: string | null;
  pitch: string | null;
  score_breakdown: ScoreBreakdown | null;
  verdict_ai: string | null;
  score_coherence_generale: number | null;
  score_coherence_cv: number | null;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  keyword: string;
  results_count: number;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  job_id: string;
  status: "bookmarked";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithJob extends Collection {
  job: Job;
}

export interface Alert {
  id: string;
  user_id: string;
  title: string;
  keyword: string;
  filters: Record<string, unknown>;
  platform: "discord" | "telegram";
  webhook_url: string;
  is_active: boolean;
  min_score: number;
  last_triggered_at: string | null;
  created_at: string;
}
