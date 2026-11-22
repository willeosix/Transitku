import http.cookiejar
import json
import math
import re
import urllib.request

PB_URL = "http://localhost:8093"
MJT_WEB_URL = "https://mjt.trans.my.id/pis/web"
ADMIN_EMAIL = "admin@transitku.id"
ADMIN_PASS = "bukan123456"

STUDENT_FRIENDLY_KORS = {"K2", "K3", "K4", "K5", "FD-1", "FD-2"}

def pb_req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{PB_URL}{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def fetch_mjt_data():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")]
    html = opener.open(MJT_WEB_URL, timeout=20).read().decode("utf-8", errors="replace")
    api_url = re.search(r"""apiUrl\s*:\s*['"]([^'"]+)['"]""", html).group(1)
    nonce = re.search(r"""pisNonce\s*:\s*['"]([^'"]+)['"]""", html).group(1)

    def call(ep):
        req = urllib.request.Request(
            f"{api_url}/{ep}",
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "X-PIS-Nonce": nonce,
                "Referer": MJT_WEB_URL,
            },
        )
        return json.loads(opener.open(req, timeout=20).read().decode("utf-8", errors="replace")).get("data", [])

    return call("json_getRoutes"), call("json_getInitialBuses")

def ensure_corridor_map_fields(token):
    col = pb_req("GET", "/api/collections/corridors", token=token)
    existing = col.get("fields", [])
    names = {f["name"] for f in existing}
    changed = False
    for fname in ("color", "polyline"):
        if fname not in names:
            existing.append({"name": fname, "type": "text", "required": False})
            changed = True
    if changed:
        pb_req("PATCH", f"/api/collections/{col['id']}", {"fields": existing}, token=token)
        print("Added color and polyline fields to corridors")

def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def detect_zone(name, lat, lon):
    low = name.lower()
    if any(k in low for k in ["itb", "ganesha", "unpad", "upi", "kampus", "telkom", "unisba", "unpar", "isbi", "smk", "smp", "sma", "politeknik", "sttb"]):
        return "campus"
    if any(k in low for k in ["alun", "braga", "asia afrika", "gedung sate", "gasibu", "museum", "dago", "cihampelas", "taman", "stasiun"]):
        return "tourism"
    if haversine(lat, lon, -6.8932, 107.6104) < 1.3:
        return "campus"
    if haversine(lat, lon, -6.9218, 107.6071) < 1.0 or haversine(lat, lon, -6.9025, 107.6188) < 1.0:
        return "tourism"
    return "general"

def main():
    token = pb_req(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": ADMIN_EMAIL, "password": ADMIN_PASS},
    )["token"]

    ensure_corridor_map_fields(token)

    routes, buses = fetch_mjt_data()
    if not routes:
        raise RuntimeError("MJT json_getRoutes kosong")

    best_by_kor = {}
    for r in routes:
        kor = str(r.get("kor", "")).strip()
        if not kor:
            continue
        prev = best_by_kor.get(kor)
        if not prev or len(r.get("shelters", [])) > len(prev.get("shelters", [])):
            best_by_kor[kor] = r

    existing_corridors = pb_req("GET", "/api/collections/corridors/records?perPage=100", token=token).get("items", [])
    by_code = {c["code"]: c["id"] for c in existing_corridors}

    corridor_ids = {}
    active_codes = set()
    for kor in sorted(best_by_kor.keys()):
        r = best_by_kor[kor]
        active_codes.add(kor)
        route_label = str(r.get("route") or kor).strip()
        origin = str(r.get("origin") or route_label.split("-")[0]).strip()
        destination = str(r.get("toward") or route_label.split("-")[-1]).strip()
        jam_ops = str(r.get("jam_ops") or "05:00 - 20:00").strip()
        if "WIB" not in jam_ops.upper():
            jam_ops = f"{jam_ops} WIB"

        payload = {
            "code": kor,
            "name": f"Metro Jabar Trans {kor} · {route_label}",
            "mode": "Bus Kota",
            "origin": origin,
            "destination": destination,
            "fare": 4900,
            "operating_hours": jam_ops,
            "student_friendly": kor in STUDENT_FRIENDLY_KORS,
            "color": str(r.get("color") or "#1D4ED8"),
            "polyline": str(r.get("points") or ""),
        }
        if kor in by_code:
            pb_req("PATCH", f"/api/collections/corridors/records/{by_code[kor]}", payload, token=token)
            corridor_ids[kor] = by_code[kor]
        else:
            created = pb_req("POST", "/api/collections/corridors/records", payload, token=token)
            corridor_ids[kor] = created["id"]

    existing_stops = pb_req("GET", "/api/collections/stops/records?perPage=1000", token=token).get("items", [])
    for s in existing_stops:
        pb_req("DELETE", f"/api/collections/stops/records/{s['id']}", token=token)

    stop_count = 0
    for kor, r in best_by_kor.items():
        cid = corridor_ids[kor]
        for seq, sh in enumerate(r.get("shelters", []), start=1):
            lat = sh.get("latitude")
            lon = sh.get("longitude")
            sname = str(sh.get("nama_selter") or "").strip()
            if lat is None or lon is None or not sname:
                continue
            lat_f, lon_f = float(lat), float(lon)
            pb_req(
                "POST",
                "/api/collections/stops/records",
                {
                    "name": sname,
                    "corridor": cid,
                    "sequence": seq,
                    "latitude": round(lat_f, 6),
                    "longitude": round(lon_f, 6),
                    "zone_tag": detect_zone(sname, lat_f, lon_f),
                    "nearby_landmark": f"Shelter Metro Jabar Trans {kor}",
                    "facilities": str(sh.get("kategori") or "Shelter Resmi MJT"),
                },
                token=token,
            )
            stop_count += 1

    existing_vehicles = pb_req("GET", "/api/collections/vehicles/records?perPage=300", token=token).get("items", [])
    for v in existing_vehicles:
        pb_req("DELETE", f"/api/collections/vehicles/records/{v['id']}", token=token)

    buses_by_kor = {}
    for b in buses:
        kor = str(b.get("kor") or "").strip()
        if kor in corridor_ids and b.get("lat") is not None and b.get("lon") is not None:
            buses_by_kor.setdefault(kor, []).append(b)

    vehicle_count = 0
    seen_plates = set()
    for kor, blist in buses_by_kor.items():
        blist.sort(key=lambda x: str(x.get("gps_time") or ""), reverse=True)
        cid = corridor_ids[kor]
        slot = 0
        for b in blist:
            if slot >= 4:
                break
            plate = str(b.get("nopol") or b.get("name") or b.get("id")).strip()
            if not plate or plate in seen_plates:
                continue
            seen_plates.add(plate)
            slot += 1
            init_load = 84 if slot == 1 else (36 if slot == 2 else (62 if slot == 3 else 42))
            status = "RED" if init_load > 80 else ("GREEN" if init_load < 50 else "YELLOW")
            pb_req(
                "POST",
                "/api/collections/vehicles/records",
                {
                    "plate_number": plate,
                    "corridor": cid,
                    "vehicle_type": "Bus Kota",
                    "latitude": round(float(b["lat"]), 6),
                    "longitude": round(float(b["lon"]), 6),
                    "capacity_max": 40,
                    "passenger_count": int(round(40 * init_load / 100)),
                    "load_factor": init_load,
                    "crowd_status": status,
                    "eta_next_stop_min": 2 + (slot - 1) * 7,
                    "headway_min": 8,
                },
                token=token,
            )
            vehicle_count += 1

    for c in existing_corridors:
        if c["code"] not in active_codes:
            pb_req("DELETE", f"/api/collections/corridors/records/{c['id']}", token=token)

    print(
        f"Sinkronisasi MJT selesai: {len(corridor_ids)} koridor live, "
        f"{stop_count} shelter resmi, {vehicle_count} armada MJT live."
    )

if __name__ == "__main__":
    main()
