import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns distance in kilometers between two coordinates."""
    R = 6371.0
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 2)

def is_within_radius(
    user_lat: float, user_lng: float,
    store_lat: float, store_lng: float,
    radius_km: float
) -> bool:
    return haversine_distance(user_lat, user_lng, store_lat, store_lng) <= radius_km
