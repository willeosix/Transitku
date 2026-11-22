import json
import urllib.error
import urllib.request

TRANSIT_URL = "http://localhost:8093"
ACCOUNT_URL = "http://localhost:8094"
ADMIN_EMAIL = "admin@transitku.id"
ADMIN_PASS = "bukan123456"

def pb_req(base_url, method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{base_url}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {base_url}{path} -> {exc.code}: {detail}") from exc

def auth_superuser(base_url):
    res = pb_req(
        base_url,
        "POST",
        "/api/collections/_superusers/auth-with-password",
        {"identity": ADMIN_EMAIL, "password": ADMIN_PASS},
    )
    return res["token"]

def ensure_fields(base_url, token, collection_name, required_fields, rules=None):
    col = pb_req(base_url, "GET", f"/api/collections/{collection_name}", token=token)
    existing = col.get("fields", [])
    existing_names = {f["name"] for f in existing}
    updated = list(existing)
    changed = False

    for field in required_fields:
        if field["name"] not in existing_names:
            updated.append(field)
            changed = True

    payload = {"fields": updated}
    if rules:
        for k, v in rules.items():
            if col.get(k) != v:
                payload[k] = v
                changed = True

    if changed:
        pb_req(base_url, "PATCH", f"/api/collections/{col['id']}", payload, token=token)
        print(f"Updated collection {collection_name} on {base_url}")
    else:
        print(f"Collection {collection_name} on {base_url} already up to date")

def main():
    t_token = auth_superuser(TRANSIT_URL)
    a_token = auth_superuser(ACCOUNT_URL)

    ensure_fields(
        TRANSIT_URL,
        t_token,
        "corridors",
        [
            {
                "name": "mode",
                "type": "select",
                "maxSelect": 1,
                "values": ["Bus Kota", "KRL", "Angkot"],
                "required": False,
            }
        ],
    )

    ensure_fields(
        TRANSIT_URL,
        t_token,
        "stops",
        [
            {
                "name": "facilities",
                "type": "text",
                "required": False,
            }
        ],
    )

    ensure_fields(
        TRANSIT_URL,
        t_token,
        "crowd_reports",
        [
            {
                "name": "report_type",
                "type": "select",
                "maxSelect": 1,
                "values": ["FULL", "QUEUE", "TRAFFIC"],
                "required": False,
            },
            {"name": "latitude", "type": "number", "required": False},
            {"name": "longitude", "type": "number", "required": False},
            {"name": "trust_score", "type": "number", "required": False},
            {"name": "created", "type": "autodate", "onCreate": True, "onUpdate": False},
        ],
    )

    ensure_fields(
        ACCOUNT_URL,
        a_token,
        "users",
        [
            {
                "name": "favorite_corridors",
                "type": "json",
                "required": False,
            }
        ],
        rules={
            "viewRule": "id = @request.auth.id",
            "updateRule": "id = @request.auth.id",
        },
    )

    corridors_res = pb_req(TRANSIT_URL, "GET", "/api/collections/corridors/records?perPage=50", token=t_token)
    by_code = {c["code"]: c for c in corridors_res.get("items", [])}

    desired_corridors = [
        {
            "code": "TMP-K1",
            "name": "Trans Metro Pasundan Koridor 1",
            "mode": "Bus Kota",
            "origin": "Leuwipanjang",
            "destination": "Soreang",
            "fare": 4900,
            "operating_hours": "05:00 - 21:00 WIB",
            "student_friendly": False,
        },
        {
            "code": "TMP-K2",
            "name": "Trans Metro Pasundan Koridor 2",
            "mode": "Bus Kota",
            "origin": "Kota Baru Parahyangan",
            "destination": "Alun-Alun Bandung",
            "fare": 4900,
            "operating_hours": "05:00 - 21:00 WIB",
            "student_friendly": True,
        },
        {
            "code": "TMB-K2",
            "name": "Trans Metro Bandung Koridor 2",
            "mode": "Bus Kota",
            "origin": "Cicaheum",
            "destination": "Cibeureum",
            "fare": 4000,
            "operating_hours": "05:30 - 20:30 WIB",
            "student_friendly": True,
        },
        {
            "code": "KRL-BDR",
            "name": "Commuter Line Bandung Raya",
            "mode": "KRL",
            "origin": "Padalarang",
            "destination": "Cicalengka",
            "fare": 5000,
            "operating_hours": "04:30 - 22:30 WIB",
            "student_friendly": True,
        },
        {
            "code": "ANG-05",
            "name": "Angkot Kalapa - Dago (via ITB)",
            "mode": "Angkot",
            "origin": "Abdul Muis (Kebon Kalapa)",
            "destination": "Terminal Dago",
            "fare": 5000,
            "operating_hours": "05:30 - 22:00 WIB",
            "student_friendly": True,
        },
    ]

    corridor_ids = {}
    for item in desired_corridors:
        existing = by_code.get(item["code"])
        if existing:
            pb_req(TRANSIT_URL, "PATCH", f"/api/collections/corridors/records/{existing['id']}", item, token=t_token)
            corridor_ids[item["code"]] = existing["id"]
        else:
            created = pb_req(TRANSIT_URL, "POST", "/api/collections/corridors/records", item, token=t_token)
            corridor_ids[item["code"]] = created["id"]

    vehicles_res = pb_req(TRANSIT_URL, "GET", "/api/collections/vehicles/records?perPage=50", token=t_token)
    by_plate = {v["plate_number"]: v for v in vehicles_res.get("items", [])}

    desired_vehicles = [
        {
            "plate_number": "D 7501 AA",
            "corridor": corridor_ids["TMP-K2"],
            "vehicle_type": "Bus Kota",
            "latitude": -6.9150,
            "longitude": 107.6040,
            "capacity_max": 40,
            "passenger_count": 36,
            "load_factor": 90,
            "crowd_status": "RED",
            "eta_next_stop_min": 3,
            "headway_min": 8,
        },
        {
            "plate_number": "D 7502 AA",
            "corridor": corridor_ids["TMP-K2"],
            "vehicle_type": "Bus Kota",
            "latitude": -6.9195,
            "longitude": 107.5965,
            "capacity_max": 40,
            "passenger_count": 14,
            "load_factor": 35,
            "crowd_status": "GREEN",
            "eta_next_stop_min": 11,
            "headway_min": 8,
        },
        {
            "plate_number": "D 7508 AA",
            "corridor": corridor_ids["TMP-K1"],
            "vehicle_type": "Bus Kota",
            "latitude": -6.9482,
            "longitude": 107.5931,
            "capacity_max": 40,
            "passenger_count": 26,
            "load_factor": 65,
            "crowd_status": "YELLOW",
            "eta_next_stop_min": 5,
            "headway_min": 10,
        },
        {
            "plate_number": "D 7612 TMB",
            "corridor": corridor_ids["TMB-K2"],
            "vehicle_type": "Bus Kota",
            "latitude": -6.9055,
            "longitude": 107.6410,
            "capacity_max": 35,
            "passenger_count": 12,
            "load_factor": 34,
            "crowd_status": "GREEN",
            "eta_next_stop_min": 6,
            "headway_min": 12,
        },
        {
            "plate_number": "KA 352 BDR",
            "corridor": corridor_ids["KRL-BDR"],
            "vehicle_type": "KRL",
            "latitude": -6.9126,
            "longitude": 107.6024,
            "capacity_max": 240,
            "passenger_count": 204,
            "load_factor": 85,
            "crowd_status": "RED",
            "eta_next_stop_min": 4,
            "headway_min": 15,
        },
        {
            "plate_number": "KA 354 BDR",
            "corridor": corridor_ids["KRL-BDR"],
            "vehicle_type": "KRL",
            "latitude": -6.9165,
            "longitude": 107.5840,
            "capacity_max": 240,
            "passenger_count": 96,
            "load_factor": 40,
            "crowd_status": "GREEN",
            "eta_next_stop_min": 19,
            "headway_min": 15,
        },
        {
            "plate_number": "D 1924 UD",
            "corridor": corridor_ids["ANG-05"],
            "vehicle_type": "Angkot",
            "latitude": -6.8980,
            "longitude": 107.6145,
            "capacity_max": 12,
            "passenger_count": 8,
            "load_factor": 67,
            "crowd_status": "YELLOW",
            "eta_next_stop_min": 3,
            "headway_min": 5,
        },
        {
            "plate_number": "D 1930 UD",
            "corridor": corridor_ids["ANG-05"],
            "vehicle_type": "Angkot",
            "latitude": -6.8895,
            "longitude": 107.6130,
            "capacity_max": 12,
            "passenger_count": 4,
            "load_factor": 33,
            "crowd_status": "GREEN",
            "eta_next_stop_min": 8,
            "headway_min": 5,
        },
    ]

    for v in desired_vehicles:
        existing = by_plate.get(v["plate_number"])
        if existing:
            pb_req(TRANSIT_URL, "PATCH", f"/api/collections/vehicles/records/{existing['id']}", v, token=t_token)
        else:
            pb_req(TRANSIT_URL, "POST", "/api/collections/vehicles/records", v, token=t_token)

    reports_res = pb_req(TRANSIT_URL, "GET", "/api/collections/crowd_reports/records?perPage=50", token=t_token)
    for rep in reports_res.get("items", []):
        patch = {}
        if not rep.get("report_type"):
            patch["report_type"] = "FULL" if rep.get("reported_status") == "RED" else "QUEUE"
        if not rep.get("trust_score"):
            patch["trust_score"] = 90 if rep.get("is_verified") else 72
        if not rep.get("latitude"):
            patch["latitude"] = -6.9147
        if not rep.get("longitude"):
            patch["longitude"] = 107.6098
        if patch:
            pb_req(TRANSIT_URL, "PATCH", f"/api/collections/crowd_reports/records/{rep['id']}", patch, token=t_token)

    all_cols = pb_req(TRANSIT_URL, "GET", "/api/collections?perPage=50", token=t_token).get("items", [])
    transit_cols = [c for c in all_cols if c["name"] in ("corridors", "stops", "vehicles", "crowd_reports")]
    with open("pb_schema/transit_collections.json", "w", encoding="utf-8") as fh:
        json.dump(transit_cols, fh, indent=2)

    print("Schema update, seed, and export complete.")

if __name__ == "__main__":
    main()
