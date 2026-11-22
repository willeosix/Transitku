import json
import math
import re
import urllib.error
import urllib.request

PB_URL = "http://localhost:8093"
BEMO_ROUTES_URL = "https://bemo.uptangkutan-bandung.id/api/mobile/v1/route_get_halte"
BEMO_LIVE_URL = "https://bemo.uptangkutan-bandung.id/map/live"
ADMIN_EMAIL = "admin@transitku.id"
ADMIN_PASS = "bukan123456"

CORRIDOR_META = {
    "TMB K1": {
        "name": "Trans Metro Bandung Koridor 1",
        "origin": "Elang Cibeureum",
        "destination": "Cibiru",
        "fare": 4000,
        "operating_hours": "05:30 - 20:00 WIB",
        "student_friendly": True,
        "headway_min": 10,
    },
    "TMB K2": {
        "name": "Trans Metro Bandung Koridor 2",
        "origin": "Cicaheum",
        "destination": "Cibeureum",
        "fare": 4000,
        "operating_hours": "05:30 - 20:00 WIB",
        "student_friendly": True,
        "headway_min": 10,
    },
    "TMB K3": {
        "name": "Trans Metro Bandung Koridor 3",
        "origin": "Cicaheum",
        "destination": "Sarijadi",
        "fare": 4000,
        "operating_hours": "05:30 - 20:00 WIB",
        "student_friendly": True,
        "headway_min": 12,
    },
    "TMB K4": {
        "name": "Trans Metro Bandung Koridor 4",
        "origin": "Antapani",
        "destination": "Terminal Leuwipanjang",
        "fare": 4000,
        "operating_hours": "05:30 - 20:00 WIB",
        "student_friendly": False,
        "headway_min": 12,
    },
    "TMB K5": {
        "name": "Trans Metro Bandung Koridor 5",
        "origin": "Antapani",
        "destination": "Stasiun Hall",
        "fare": 4000,
        "operating_hours": "05:30 - 20:00 WIB",
        "student_friendly": True,
        "headway_min": 12,
    },
}

def http_json(url, method="GET", data=None, headers=None):
    hdrs = {"User-Agent": "TransitKu-Bandung-ITB/2.0", "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    body = None
    if data is not None:
        hdrs["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def pb_req(method, path, data=None, token=None):
    hdrs = {"Authorization": token} if token else None
    return http_json(f"{PB_URL}{path}", method=method, data=data, headers=hdrs)

def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def detect_zone(name, lat, lon):
    low = name.lower()
    if any(k in low for k in ["itb", "ganesha", "unpad", "upi", "kampus", "telkom", "unisba", "unpar", "polban", "sarijadi", "maranatha"]):
        return "campus"
    if any(k in low for k in ["alun", "braga", "asia afrika", "gedung sate", "gasibu", "museum", "dago", "cihampelas", "stasiun"]):
        return "tourism"
    if haversine(lat, lon, -6.8932, 107.6104) < 1.3:
        return "campus"
    if haversine(lat, lon, -6.9218, 107.6071) < 1.0 or haversine(lat, lon, -6.9025, 107.6188) < 1.0:
        return "tourism"
    return "general"

def map_bemo_vehicle_to_corridor(vehicle_no, vehicle_code):
    text = f"{vehicle_no} {vehicle_code}".upper()
    if "KORIDOR 1" in text:
        return "TMB K1"
    if "KORIDOR 2" in text:
        return "TMB K2"
    if "KORIDOR 3" in text:
        return "TMB K3"
    if "KORIDOR 4" in text:
        return "TMB K4"
    if "KORIDOR 5" in text or "FEEDER 1" in text:
        return "TMB K5"
    return None

def extract_plate(vehicle_no):
    match = re.match(r"^([A-Z]\s*\d{3,4}\s*[A-Z0-9]{1,3})", vehicle_no.strip().upper())
    return match.group(1) if match else vehicle_no[:12].strip()

def main():
    auth = pb_req(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": ADMIN_EMAIL, "password": ADMIN_PASS},
    )
    token = auth["token"]

    bemo_routes = http_json(BEMO_ROUTES_URL).get("data", [])
    if not bemo_routes:
        raise RuntimeError("BEMO route_get_halte tidak mengembalikan data")

    existing_corridors = pb_req("GET", "/api/collections/corridors/records?perPage=100", token=token).get("items", [])
    by_code = {c["code"]: c["id"] for c in existing_corridors}

    active_codes = set()
    corridor_ids = {}

    for route in sorted(bemo_routes, key=lambda r: r.get("code", "")):
        code = route.get("code", "").strip()
        if not code:
            continue
        active_codes.add(code)
        meta = CORRIDOR_META.get(code, {})
        raw_name = route.get("name", code).title()
        parts = [p.strip() for p in raw_name.split("-")]
        payload = {
            "code": code,
            "name": meta.get("name", f"Trans Metro Bandung {code}"),
            "mode": "Bus Kota",
            "origin": meta.get("origin", parts[0] if parts else raw_name),
            "destination": meta.get("destination", parts[-1] if len(parts) > 1 else raw_name),
            "fare": meta.get("fare", 4000),
            "operating_hours": meta.get("operating_hours", "05:30 - 20:00 WIB"),
            "student_friendly": meta.get("student_friendly", True),
        }

        if code in by_code:
            pb_req("PATCH", f"/api/collections/corridors/records/{by_code[code]}", payload, token=token)
            corridor_ids[code] = by_code[code]
        else:
            created = pb_req("POST", "/api/collections/corridors/records", payload, token=token)
            corridor_ids[code] = created["id"]

    existing_stops = pb_req("GET", "/api/collections/stops/records?perPage=1000", token=token).get("items", [])
    for stop in existing_stops:
        pb_req("DELETE", f"/api/collections/stops/records/{stop['id']}", token=token)

    stop_count = 0
    for route in bemo_routes:
        code = route.get("code", "").strip()
        cid = corridor_ids.get(code)
        if not cid:
            continue
        for seq, pt in enumerate(route.get("points", []), start=1):
            lat = float(pt["lat"])
            lon = float(pt["lng"])
            stop_name = str(pt.get("stop_name", "")).strip().title()
            stop_code = str(pt.get("stop_code", "")).strip()
            if not stop_name:
                continue
            pb_req(
                "POST",
                "/api/collections/stops/records",
                {
                    "name": stop_name,
                    "corridor": cid,
                    "sequence": seq,
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6),
                    "zone_tag": detect_zone(stop_name, lat, lon),
                    "nearby_landmark": f"Kode Halte {stop_code} · Dishub Kota Bandung",
                    "facilities": "Halte Resmi Trans Metro Bandung",
                },
                token=token,
            )
            stop_count += 1

    existing_vehicles = pb_req("GET", "/api/collections/vehicles/records?perPage=200", token=token).get("items", [])
    for v in existing_vehicles:
        pb_req("DELETE", f"/api/collections/vehicles/records/{v['id']}", token=token)

    bemo_live = http_json(BEMO_LIVE_URL).get("data", {}).get("result", {}).get("data", [])
    added_per_corridor = {}
    vehicle_count = 0
    for item in bemo_live:
        vno = str(item.get("vehicle_no", ""))
        vcode = str(item.get("vehicle_code", ""))
        if "BANDROS" in vno.upper() or "BUS SEKOLAH" in vcode.upper():
            continue
        corridor_code = map_bemo_vehicle_to_corridor(vno, vcode)
        if not corridor_code or corridor_code not in corridor_ids:
            continue
        if added_per_corridor.get(corridor_code, 0) >= 3:
            continue
        gps = item.get("gps_position") or {}
        lat = float(gps.get("lat") or -6.9147)
        lon = float(gps.get("lng") or 107.6098)
        plate = extract_plate(vno)
        added_per_corridor[corridor_code] = added_per_corridor.get(corridor_code, 0) + 1
        idx = added_per_corridor[corridor_code]
        init_load = 85 if idx == 1 else (38 if idx == 2 else 62)
        init_status = "RED" if init_load > 80 else ("GREEN" if init_load < 50 else "YELLOW")
        headway = CORRIDOR_META.get(corridor_code, {}).get("headway_min", 10)
        pb_req(
            "POST",
            "/api/collections/vehicles/records",
            {
                "plate_number": plate,
                "corridor": corridor_ids[corridor_code],
                "vehicle_type": "Bus Kota",
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "capacity_max": 40,
                "passenger_count": int(round(40 * init_load / 100)),
                "load_factor": init_load,
                "crowd_status": init_status,
                "eta_next_stop_min": 3 + (idx - 1) * headway,
                "headway_min": headway,
            },
            token=token,
        )
        vehicle_count += 1

    for c in existing_corridors:
        if c["code"] not in active_codes:
            pb_req("DELETE", f"/api/collections/corridors/records/{c['id']}", token=token)

    print(
        f"Sinkronisasi BEMO selesai: {len(corridor_ids)} koridor TMB, "
        f"{stop_count} halte resmi, {vehicle_count} armada bus live."
    )

if __name__ == "__main__":
    main()
