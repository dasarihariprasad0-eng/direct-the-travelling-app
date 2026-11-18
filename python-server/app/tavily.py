"""Tavily web-search integration.

A single module-level AsyncClient is reused across all requests (connection
pooling, keep-alive).  The client is initialised by the FastAPI lifespan
handler in main.py and torn down cleanly on shutdown.
"""
import httpx
from fastapi import HTTPException
from .config import get_settings

# Shared async HTTP client -- initialised by main.py lifespan, never None
# during normal request handling.
_client: httpx.AsyncClient | None = None


def set_client(client: httpx.AsyncClient) -> None:
    """Called once at startup to inject the shared client."""
    global _client
    _client = client


def _get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("HTTP client has not been initialised.")
    return _client


async def search(query: str, max_results: int = 5) -> list[dict]:
    key = get_settings().tavily_api_key
    if not key:
        return []
    payload = {
        "query": query,
        "search_depth": "advanced",
        "max_results": max_results,
        "include_answer": True,
    }
    try:
        response = await _get_client().post(
            "https://api.tavily.com/search",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if response.status_code == 429:
            raise HTTPException(429, "Tavily search quota or rate limit reached.")
        if response.status_code >= 400:
            raise HTTPException(502, f"Tavily returned status {response.status_code}.")
        data = response.json()
        return [
            {
                "title": x.get("title", ""),
                "url": x.get("url", ""),
                "content": x.get("content", ""),
            }
            for x in data.get("results", [])
        ]
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Tavily search is temporarily unavailable.") from exc
