import json
import math
import urllib.parse
import urllib.request

PB_URL = "http://localhost:8093"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

def pb_req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{PB_URL}{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def fetch_osm_bandung():
    query = """
    [out:json][timeout:45];
    (
      node["highway"="bus_stop"](-6.965,107.545,-6.845,107.715);
      node["railway"~"^(station|halt)$"](-6.965,107.545,-6.845,107.715);
    );
    out body;
    """
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    for url in OVERPASS_URLS:
        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"User-Agent": "TransitKu-Bandung-ITB/1.0"},
            )
            with urllib.request.urlopen(req, timeout=50) as resp:
                elements = json.loads(resp.read().decode("utf-8")).get("elements", [])
                if elements:
                    print(f"Berhasil mengambil {len(elements)} node dari {url}")
                    return elements
        except Exception as exc:
            print(f"Gagal mengakses {url}: {exc}")
    return []

def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))

def detect_zone(name, lat, lon):
    low = name.lower()
    if any(k in low for k in ["itb", "ganesha", "unpad", "upi", "kampus", "telkom", "unisba", "unpar"]):
        return "campus"
    if any(k in low for k in ["alun", "braga", "asia afrika", "gedung sate", "gasibu", "museum", "dago", "cihampelas"]):
        return "tourism"
    if haversine(lat, lon, -6.8932, 107.6104) < 1.2:
        return "campus"
    if haversine(lat, lon, -6.9218, 107.6071) < 1.0 or haversine(lat, lon, -6.9025, 107.6188) < 1.0:
        return "tourism"
    return "general"

def main():
    auth = pb_req(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": "admin@transitku.id", "password": "bukan123456"},
    )
    token = auth["token"]

    corridors = pb_req("GET", "/api/collections/corridors/records?perPage=50", token=token).get("items", [])
    by_code = {c["code"]: c["id"] for c in corridors}
    if not by_code:
        print("Koleksi corridors kosong.")
        return

    elements = fetch_osm_bandung()
    print(f"Total node ditemukan dari OpenStreetMap Bandung: {len(elements)}")
    if not elements:
        print("Melewati penghapusan stops karena Overpass tidak mengembalikan data.")
        return

    existing = pb_req("GET", "/api/collections/stops/records?perPage=500", token=token).get("items", [])
    for item in existing:
        pb_req("DELETE", f"/api/collections/stops/records/{item['id']}", token=token)

    inserted = 0
    seen_names = set()
    seq_per_corridor = {}
    for el in elements:
        tags = el.get("tags", {})
        raw_name = tags.get("name") or tags.get("ref")
        if not raw_name:
            continue
        clean_name = raw_name.strip()
        if clean_name.lower() in seen_names:
            continue
        seen_names.add(clean_name.lower())

        lat = float(el["lat"])
        lon = float(el["lon"])
        is_rail = tags.get("railway") in ("station", "halt")

        if is_rail and "KRL-BDR" in by_code:
            cid = by_code["KRL-BDR"]
        elif lon > 107.635 and "TMB-K2" in by_code:
            cid = by_code["TMB-K2"]
        elif lat > -6.905 and "ANG-05" in by_code:
            cid = by_code["ANG-05"]
        elif lat < -6.935 and "TMP-K1" in by_code:
            cid = by_code["TMP-K1"]
        else:
            cid = by_code.get("TMP-K2") or next(iter(by_code.values()))

        seq_per_corridor[cid] = seq_per_corridor.get(cid, 0) + 1
        operator = tags.get("operator", "Dishub Kota Bandung / KAI")
        zone = detect_zone(clean_name, lat, lon)
        facilities = "Peron Stasiun KRL, Loket Tiket" if is_rail else "Halte Angkutan Umum Bandung"
        if tags.get("shelter") == "yes":
            facilities = "Shelter Beratap, Bangku Tunggu"

        pb_req(
            "POST",
            "/api/collections/stops/records",
            {
                "name": clean_name,
                "corridor": cid,
                "sequence": seq_per_corridor[cid],
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "zone_tag": zone,
                "nearby_landmark": f"OSM ID {el['id']} ({operator})",
                "facilities": facilities,
            },
            token=token,
        )
        inserted += 1

    print(f"Berhasil menyinkronkan {inserted} halte dan stasiun nyata Bandung ke PocketBase.")

if __name__ == "__main__":
    main()
