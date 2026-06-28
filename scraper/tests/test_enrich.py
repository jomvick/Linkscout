"""
Tests pour enrich.py — génération d'URLs unavatar.io.
Clearbit est mort (DNS désactivé), on génère des URLs sans appel HTTP.
"""

import pytest
from enrich import (
    clean_company_name,
    company_slug,
    enrich_job,
    enrich_jobs,
    fetch_logo,
    make_logo_url,
)


class TestCleanCompanyName:
    def test_removes_legal_suffixes(self):
        assert clean_company_name("TechCorp Inc.") == "TechCorp"
        assert clean_company_name("Startup LLC") == "Startup"
        assert clean_company_name("GmbH GmbH") == "GmbH"
        assert clean_company_name("Société SAS") == "Société"

    def test_removes_non_word_chars(self):
        assert clean_company_name("Tech-Corp, Inc.") == "TechCorp"
        assert clean_company_name("Hello (World) Ltd.") == "Hello World"

    def test_returns_empty_for_empty_input(self):
        assert clean_company_name("") == ""
        assert clean_company_name(None) == ""

    def test_preserves_accented_chars(self):
        result = clean_company_name("Département Corp.")
        assert "Département" in result

    def test_multiple_suffixes_handled(self):
        assert clean_company_name("Data Solutions Group LLC") == "Data Solutions Group"
        assert (
            clean_company_name("Cloud Services Holdings Ltd.")
            == "Cloud Services Holdings"
        )


class TestCompanySlug:
    def test_well_known_companies(self):
        assert company_slug("Google") == "google"
        assert company_slug("Nuro") == "nuro"
        assert company_slug("Meta Platforms, Inc.") == "metaplatforms"

    def test_strips_legal_suffix_then_slugifies(self):
        assert company_slug("TechCorp Inc.") == "techcorp"
        assert company_slug("Zest for Tech") == "zestfortech"
        assert company_slug("Crossing Hurdles") == "crossinghurdles"

    def test_lowercase_alphanumeric_only(self):
        slug = company_slug("Hello-World LLC!")
        assert slug == slug.lower()
        assert slug.isalnum()

    def test_empty_and_whitespace(self):
        assert company_slug("") == ""
        assert company_slug("   ") == ""


class TestMakeLogoUrl:
    def test_returns_unavatar_url(self):
        url = make_logo_url("Google")
        assert url is not None
        assert "unavatar.io" in url
        assert "google" in url

    def test_default_tld_is_com(self):
        url = make_logo_url("Google")
        assert url is not None
        assert ".com" in url

    def test_custom_tld(self):
        url = make_logo_url("Vercel", tld="io")
        assert url is not None
        assert ".io" in url

    def test_fallback_false_param_present(self):
        """Le paramètre fallback=false permet au navigateur de détecter les 404."""
        url = make_logo_url("AnyCompany")
        assert url is not None
        assert "fallback=false" in url

    def test_empty_name_returns_none(self):
        assert make_logo_url("") is None
        assert make_logo_url("   ") is None

    def test_company_with_only_special_chars_returns_none(self):
        assert make_logo_url("!!!") is None


class TestFetchLogo:
    async def test_returns_url_for_known_company(self):
        url = await fetch_logo("Google")
        assert url is not None
        assert "unavatar.io" in url
        assert "google" in url

    async def test_returns_none_for_empty(self):
        assert await fetch_logo("") is None

    async def test_no_http_call_made(self):
        """fetch_logo génère une URL sans faire d'appel réseau."""
        # Si ça lève une exception réseau, c'est un bug
        url = await fetch_logo("NonExistentCompanyXYZ12345")
        # Retourne une URL (le navigateur gérera le 404)
        assert url is not None
        assert "unavatar.io" in url


class TestEnrichJob:
    async def test_adds_logo_url_field(self):
        job = {"company": "Google", "title": "Engineer"}
        result = await enrich_job(job)
        assert "logo_url" in result
        assert result["logo_url"] is not None
        assert "unavatar.io" in result["logo_url"]
        assert "google" in result["logo_url"]

    async def test_enrich_jobs_batch_parallel(self):
        jobs = [
            {"company": "Google", "title": "Engineer"},
            {"company": "Meta", "title": "Developer"},
            {"company": "Nuro", "title": "AI Researcher"},
        ]
        results = await enrich_jobs(jobs)
        assert len(results) == 3
        assert all("logo_url" in j for j in results)
        assert all(j["logo_url"] is not None for j in results)

    async def test_empty_company_still_adds_field(self):
        job = {"company": "", "title": "Unknown role"}
        result = await enrich_job(job)
        assert "logo_url" in result
        # Slug vide → None
        assert result["logo_url"] is None
