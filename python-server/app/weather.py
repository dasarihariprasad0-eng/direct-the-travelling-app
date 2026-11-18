"""OpenWeather-backed geocoding and forecast service.

Uses the shared httpx.AsyncClient injected by main.py's lifespan for
connection reuse and keep-alive.  Timestamps from the API are converted to
dates using UTC to avoid local-timezone drift.
"""
from datetime import date, datetime, timedelta, timezone
import httpx
from fastapi import HTTPException
from .config import get_settings

# Shared async HTTP client -- initialised by main.py lifespan.
_client: httpx.AsyncClient | None = None


def set_client(client: httpx.AsyncClient) -> None:
    """Called once at startup to inject the shared client."""
    global _client
    _client = client


def _get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("HTTP client has not been initialised.")
    return _client


CODES = {
    200: "Thunderstorm", 300: "Drizzle", 500: "Rain", 600: "Snow", 700: "Atmosphere",
    800: "Clear", 801: "Mostly clear", 802: "Partly cloudy", 803: "Mostly cloudy", 804: "Overcast",
}


def weather_label(code):
    if code is None:
        return "Unknown"
    code = int(code)
    if code in CODES:
        return CODES[code]
    base = (code // 100) * 100
    return CODES.get(base, "Mixed conditions")


def enumerate_dates(start: str, end: str) -> list[str]:
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    if e < s:
        raise HTTPException(422, "End date cannot be before start date.")
    return [(s + timedelta(days=i)).isoformat() for i in range((e - s).days + 1)]


def _ts_to_date(ts: int) -> str:
    """Convert a UNIX timestamp to an ISO date string using UTC (not local time)."""
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()


async def geocode(name: str) -> dict | None:
    key = get_settings().openweather_api_key
    if not key:
        return None
    try:
        r = await _get_client().get(
            "https://api.openweathermap.org/geo/1.0/direct",
            params={"q": name, "limit": 5, "appid": key},
            timeout=12,
        )
        r.raise_for_status()
        results = r.json() or []
        india = [x for x in results if x.get("country") == "IN"]
        return (india or results or [None])[0]
    except httpx.HTTPError as exc:
        raise HTTPException(502, "OpenWeather geocoding is unavailable.") from exc


async def daily_weather(lat: float, lon: float, start: str, end: str) -> list[dict]:
    key = get_settings().openweather_api_key
    dates = enumerate_dates(start, end)
    if not key:
        return [
            {"date": day, "code": None, "high": None, "low": None,
             "precipitationChance": None, "source": "unavailable"}
            for day in dates
        ]
    data = None
    try:
        r = await _get_client().get(
            "https://api.openweathermap.org/data/3.0/onecall",
            params={
                "lat": lat, "lon": lon, "appid": key,
                "units": "metric", "exclude": "minutely,hourly,alerts",
            },
            timeout=20,
        )
        if r.status_code not in {401, 403, 404}:
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError:
        data = None

    if data is None:
        # Fallback to the classic 5-day / 3-hour forecast product.
        try:
            r = await _get_client().get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": lat, "lon": lon, "appid": key,
                    "units": "metric", "cnt": 40,
                },
                timeout=20,
            )
            if r.status_code == 401:
                raise HTTPException(502, "OpenWeather rejected the API key.")
            r.raise_for_status()
            data = r.json()
        except HTTPException:
            raise
        except httpx.HTTPError as exc:
            raise HTTPException(502, "OpenWeather forecast is temporarily unavailable.") from exc

    out = []
    if "daily" in data:
        by_date: dict[str, dict] = {}
        for item in data.get("daily") or []:
            dt = item.get("dt")
            if dt is not None:
                by_date[_ts_to_date(int(dt))] = item   # UTC-safe
        for day in dates:
            item = by_date.get(day)
            if not item:
                out.append({
                    "date": day, "code": None, "high": None,
                    "low": None, "precipitationChance": None, "source": "unavailable",
                })
                continue
            weather = (item.get("weather") or [{}])[0]
            out.append({
                "date": day,
                "code": weather.get("id"),
                "high": item.get("temp", {}).get("max"),
                "low": item.get("temp", {}).get("min"),
                "precipitationChance": round(float(item.get("pop", 0)) * 100),
                "precipitationMm": item.get("rain", 0),
                "source": "forecast",
                "description": weather.get("description", ""),
            })
        return out

    # Classic 3-hour forecast: aggregate available points by UTC date.
    buckets: dict[str, list] = {}
    for item in data.get("list") or []:
        stamp = item.get("dt")
        if stamp is None:
            continue
        day = _ts_to_date(int(stamp))   # UTC-safe
        buckets.setdefault(day, []).append(item)
    for day in dates:
        items = buckets.get(day, [])
        if not items:
            out.append({
                "date": day, "code": None, "high": None,
                "low": None, "precipitationChance": None, "source": "unavailable",
            })
            continue
        temps = [x.get("main", {}).get("temp") for x in items
                 if x.get("main", {}).get("temp") is not None]
        pops = [float(x.get("pop", 0)) for x in items]
        rain = sum(float((x.get("rain") or {}).get("3h", 0)) for x in items)
        representative = max(items, key=lambda x: float(x.get("pop", 0)))
        weather = (representative.get("weather") or [{}])[0]
        out.append({
            "date": day,
            "code": weather.get("id"),
            "high": max(temps) if temps else None,
            "low": min(temps) if temps else None,
            "precipitationChance": round(max(pops) * 100) if pops else 0,
            "precipitationMm": rain,
            "source": "forecast",
            "description": weather.get("description", ""),
        })
    return out
