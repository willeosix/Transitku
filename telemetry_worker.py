import datetime
import http.cookiejar
import json
import math
import re
import time
import urllib.error
import urllib.request

PB_URL = "http://localhost:8093"
MJT_WEB_URL = "https://mjt.trans.my.id/pis/web"
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=-6.9147&longitude=107.6098&current=temperature_2m,precipitation,weather_code"
)
ADMIN_EMAIL = "admin@transitku.id"
ADMIN_PASS = "bukan123456"
UPDATE_INTERVAL_SEC = 15

def pb_req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{PB_URL}{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def login_superuser():
    res = pb_req(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": ADMIN_EMAIL, "password": ADMIN_PASS},
    )
    return res["token"]

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def compute_status(load_factor):
    if load_factor < 50:
        return "GREEN"
    if load_factor <= 80:
        return "YELLOW"
    return "RED"

def fetch_bandung_weather():
    try:
        req = urllib.request.Request(OPEN_METEO_URL, headers={"User-Agent": "TransitKu-Bandung/2.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            current = json.loads(resp.read().decode("utf-8")).get("current", {})
            return float(current.get("precipitation") or 0.0) > 0.1
    except Exception:
        return False

def create_mjt_session():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")]
    html = opener.open(MJT_WEB_URL, timeout=20).read().decode("utf-8", errors="replace")
    api_url = re.search(r"""apiUrl\s*:\s*['"]([^'"]+)['"]""", html).group(1)
    nonce = re.search(r"""pisNonce\s*:\s*['"]([^'"]+)['"]""", html).group(1)
    return opener, api_url, nonce

def fetch_mjt_buses(opener, api_url, nonce):
    req = urllib.request.Request(
        f"{api_url}/json_getInitialBuses",
        headers={
            "X-Requested-With": "XMLHttpRequest",
            "X-PIS-Nonce": nonce,
            "Referer": MJT_WEB_URL,
        },
    )
    raw = opener.open(req, timeout=20).read().decode("utf-8", errors="replace")
    return json.loads(raw).get("data", [])

def wib_base_load(is_raining, slot_index):
    wib_now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)
    hour = wib_now.hour
    if 6 <= hour <= 9 or 16 <= hour <= 19:
        base = 76
    elif 10 <= hour <= 15:
        base = 54
    else:
        base = 38
    if is_raining:
        base += 10
    offset = [14, -22, 4, -12][slot_index % 4]
    return max(15, min(96, base + offset))

def main():
    token = login_superuser()
    opener, api_url, nonce = create_mjt_session()
    last_session_refresh = time.time()
    last_weather_check = 0.0
    is_raining = False

    stops = pb_req("GET", "/api/collections/stops/records?perPage=500&sort=sequence", token=token).get("items", [])
    stops_by_corridor = {}
    for s in stops:
        stops_by_corridor.setdefault(s.get("corridor", ""), []).append(s)

    while True:
        try:
            now = time.time()
            if now - last_session_refresh > 300:
                opener, api_url, nonce = create_mjt_session()
                last_session_refresh = now
            if now - last_weather_check > 300:
                is_raining = fetch_bandung_weather()
                last_weather_check = now

            try:
                mjt_buses = fetch_mjt_buses(opener, api_url, nonce)
            except Exception:
                opener, api_url, nonce = create_mjt_session()
                last_session_refresh = time.time()
                mjt_buses = fetch_mjt_buses(opener, api_url, nonce)

            live_by_plate = {}
            for b in mjt_buses:
                plate = str(b.get("nopol") or b.get("name") or "").strip().upper()
                if plate and b.get("lat") is not None and b.get("lon") is not None:
                    live_by_plate[plate] = {
                        "lat": float(b["lat"]),
                        "lng": float(b["lon"]),
                        "speed": float(b.get("speed") or 0.0),
                    }

            vehicles = pb_req("GET", "/api/collections/vehicles/records?perPage=150", token=token).get("items", [])
            slot_counter = {}
            matched = 0

            for v in vehicles:
                plate = str(v.get("plate_number", "")).strip().upper()
                cid = v.get("corridor", "")
                slot = slot_counter.get(cid, 0)
                slot_counter[cid] = slot + 1

                live = live_by_plate.get(plate)
                if live:
                    matched += 1
                    lat = live["lat"]
                    lon = live["lng"]
                    speed_kmh = live["speed"] if live["speed"] >= 5.0 else (15.0 if is_raining else 20.0)
                else:
                    lat = float(v.get("latitude") or -6.9147)
                    lon = float(v.get("longitude") or 107.6098)
                    speed_kmh = 15.0 if is_raining else 20.0

                cstops = stops_by_corridor.get(cid, [])
                if cstops:
                    nearest_km = min(haversine_km(lat, lon, float(s["latitude"]), float(s["longitude"])) for s in cstops)
                    eta_min = max(1, min(30, int(round((nearest_km / max(8.0, speed_kmh)) * 60)) + slot * 4 + 1))
                else:
                    eta_min = max(2, 4 + slot * 6)

                cap = max(1, int(v.get("capacity_max") or 40))
                load_factor = wib_base_load(is_raining, slot)
                pax = int(round((cap * load_factor) / 100.0))
                crowd_status = compute_status(load_factor)

                pb_req(
                    "PATCH",
                    f"/api/collections/vehicles/records/{v['id']}",
                    {
                        "latitude": round(lat, 6),
                        "longitude": round(lon, 6),
                        "passenger_count": pax,
                        "load_factor": load_factor,
                        "crowd_status": crowd_status,
                        "eta_next_stop_min": eta_min,
                    },
                    token=token,
                )

            print(
                f"Synced {len(vehicles)} live MJT vehicles (matched={matched}/{len(mjt_buses)}, rain={is_raining})",
                flush=True,
            )
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                token = login_superuser()
            else:
                print(f"HTTP error in MJT telemetry loop: {exc}", flush=True)
        except Exception as exc:
            print(f"MJT telemetry loop error: {exc}", flush=True)

        time.sleep(UPDATE_INTERVAL_SEC)

if __name__ == "__main__":
    main()
