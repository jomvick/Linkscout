import pytest
from unittest.mock import patch, AsyncMock
import httpx
from notifier import (
    send_discord,
    send_telegram,
    notify_alert,
    _embed_color,
)
from discord_notify import notify_discord


def _make_raising_post(post_mock, status_code: int):
    """Configure httpx post mock to raise HTTPStatusError synchronously.
    
    NOTE: httpx.Response.raise_for_status() is SYNCHRONOUS.
    """
    mock_resp = AsyncMock()
    mock_resp.status_code = status_code

    def raiser():
        raise httpx.HTTPStatusError(
            f"HTTP {status_code}",
            request=AsyncMock(),
            response=mock_resp,
        )

    mock_resp.raise_for_status = raiser
    post_mock.return_value = mock_resp


class TestEmbedColor:
    def test_green_for_90_plus(self):
        assert _embed_color(90) == 0x10B981
        assert _embed_color(100) == 0x10B981

    def test_amber_for_70_to_89(self):
        assert _embed_color(70) == 0xF59E0B
        assert _embed_color(85) == 0xF59E0B

    def test_blue_below_70(self):
        assert _embed_color(0) == 0x0A66C2
        assert _embed_color(69) == 0x0A66C2


class TestNotifyAlertTelegramTokenParsing:
    def test_split_extracts_token_and_chat_id_with_negative_chat_id(self):
        webhook = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11|||-100123456789"
        parts = webhook.split("|||")
        assert len(parts) == 2
        bot_token, chat_id = parts[0].strip(), parts[1].strip()
        assert bot_token == "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        assert chat_id == "-100123456789"

    def test_split_with_multiple_separators_not_present(self):
        webhook = "token123|||-456789"
        parts = webhook.split("|||")
        assert len(parts) == 2
        assert parts[0] == "token123"
        assert parts[1] == "-456789"

    def test_split_with_extra_whitespace(self):
        webhook = "  token:abc |||  -100123  "
        parts = webhook.split("|||")
        assert len(parts) == 2
        assert parts[0].strip() == "token:abc"
        assert parts[1].strip() == "-100123"

    def test_malformed_payload_missing_chat_id(self):
        webhook = "token_without_separator"
        parts = webhook.split("|||")
        assert len(parts) == 1

    @patch("notifier.send_telegram", new_callable=AsyncMock)
    async def test_notify_alert_telegram_parses_correctly(self, mock_send_telegram):
        mock_send_telegram.return_value = True
        alert = {
            "platform": "telegram",
            "webhook_url": "bot123:abc|||-100987654321",
        }
        job = {"title": "Test", "company": "TestCorp"}

        result = await notify_alert(alert, job)

        assert result is True
        mock_send_telegram.assert_awaited_once_with(
            "bot123:abc", "-100987654321", job
        )

    @patch("notifier.send_discord", new_callable=AsyncMock)
    async def test_notify_alert_discord_passes_webhook(self, mock_send_discord):
        mock_send_discord.return_value = True
        alert = {
            "platform": "discord",
            "webhook_url": "https://discord.com/api/webhooks/test/abc",
        }
        job = {"title": "Test", "company": "Corp"}

        result = await notify_alert(alert, job)

        assert result is True
        mock_send_discord.assert_awaited_once()


class TestDiscordWebhookFailure:
    @patch("notifier.httpx.AsyncClient")
    async def test_404_webhook_deleted_returns_false(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _make_raising_post(post, 404)

        result = await send_discord(
            "https://discord.com/api/webhooks/deleted/abc",
            {"title": "Test", "company": "Corp", "match_score": 80},
        )
        assert result is False

    @patch("notifier.httpx.AsyncClient")
    async def test_discord_timeout_returns_false(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        post.side_effect = TimeoutError("Timeout")

        result = await send_discord(
            "https://discord.com/api/webhooks/test/abc",
            {"title": "Test", "company": "Corp", "match_score": 80},
        )
        assert result is False

    @patch("notifier.httpx.AsyncClient")
    async def test_410_gone_webhook_returns_false(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _make_raising_post(post, 410)

        result = await send_discord(
            "https://discord.com/api/webhooks/gone/abc",
            {"title": "Test", "company": "Corp", "match_score": 80},
        )
        assert result is False


class TestTelegramFailure:
    @patch("notifier.httpx.AsyncClient")
    async def test_telegram_invalid_token_returns_false(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _make_raising_post(post, 401)

        result = await send_telegram(
            "invalid_token", "-100123456789",
            {"title": "Test", "company": "Corp", "match_score": 80},
        )
        assert result is False

    @patch("notifier.httpx.AsyncClient")
    async def test_telegram_chat_not_found_returns_false(self, mock_client):
        post = mock_client.return_value.__aenter__.return_value.post
        _make_raising_post(post, 400)

        result = await send_telegram(
            "token:abc", "-999",
            {"title": "Test", "company": "Corp", "match_score": 80},
        )
        assert result is False


class TestDiscordNotifyModule:
    @patch("discord_notify.httpx.AsyncClient")
    async def test_notify_discord_no_match_score_returns_false(self, mock_client):
        result = await notify_discord({"title": "Test"})
        assert result is False

    @patch("discord_notify.DISCORD_WEBHOOK_URL", None)
    @patch("discord_notify.httpx.AsyncClient")
    async def test_notify_discord_no_webhook_url_returns_false(self, mock_client):
        with patch.dict("os.environ", {"DISCORD_WEBHOOK_URL": ""}, clear=True):
            import discord_notify
            with patch.object(discord_notify, "DISCORD_WEBHOOK_URL", None):
                result = await discord_notify.notify_discord(
                    {"title": "Test", "match_score": 95}
                )
                assert result is False


class TestNotifyAlertEdgeCases:
    async def test_unknown_platform_returns_false(self):
        alert = {"platform": "slack", "webhook_url": "https://hooks.slack.com/abc"}
        result = await notify_alert(alert, {})
        assert result is False

    @patch("notifier.send_telegram", new_callable=AsyncMock)
    async def test_telegram_malformed_parts_returns_false(self, mock_send_telegram):
        alert = {"platform": "telegram", "webhook_url": "no_separator"}
        result = await notify_alert(alert, {})
        assert result is False
        mock_send_telegram.assert_not_awaited()

    async def test_notify_alert_empty_webhook_url(self):
        alert = {"platform": "discord", "webhook_url": ""}
        with patch("notifier.send_discord", new_callable=AsyncMock) as mock:
            mock.return_value = False
            result = await notify_alert(alert, {})
            assert result is False
