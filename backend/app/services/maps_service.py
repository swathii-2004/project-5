import googlemaps
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class MapsService:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None and settings.GOOGLE_MAPS_API_KEY:
            cls._client = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
        return cls._client

async def geocode_address(address: str, city: str) -> dict | None:
    """
    Geocodes an address and city to lat/lng coordinates.
    Returns fallback (0,0) if API key is missing.
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY not set. Using fallback coordinates.")
        return {"lat": 0.0, "lng": 0.0}

    try:
        gmaps = MapsService.get_client()
        if not gmaps:
            return {"lat": 0.0, "lng": 0.0}

        results = gmaps.geocode(f"{address}, {city}")
        if not results:
            logger.error(f"No geocoding results found for: {address}, {city}")
            return None

        location = results[0]["geometry"]["location"]
        return {
            "lat": float(location["lat"]),
            "lng": float(location["lng"])
        }
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return None
