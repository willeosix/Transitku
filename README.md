# TransitKu Microservice Backend & Mobile App (Tugas Besar II3160 TST x II3140 PWAM)

**Kelompok Aglio**
- Christian Wilfredo Pakpahan (18224038)
- Nicholas Putra Halim (18224098)

---

## 1. Arsitektur Sistem

TransitKu menerapkan pola arsitektur **Microservice dengan Database-per-Service**, **API Gateway (Nginx)**, dan **Anti-Corruption Layer** yang di-deploy di atas Set-Top Box (STB) Armbian ARM64 menggunakan Docker Compose. Seluruh lalu lintas publik dialirkan melalui Cloudflare Tunnel berbasis HTTPS pada **`https://aglio.stei.site/api/`** tanpa membuka port lokal ke internet.

```text
[Aplikasi Mobile TransitKu / Mitra JejakBandung & LokaCerita]
                           |
                           | HTTPS (Cloudflare Tunnel)
                           | https://aglio.stei.site/api/v1/*
                           v
               +-----------------------+
               |  API Gateway (Nginx)  |  --> Rate Limit (10 req/s) + Validasi X-API-Key / Bearer JWT
               +-----------------------+
                    |             |
                    |             +-------------------------------+
                    v                                             v
          +-----------------------+                     +-----------------------+
          |   transit-service     |                     |   account-service     |
          |  (PocketBase :8093)   |                     |  (PocketBase :8094)   |
          | - corridors (8 MJT)   |                     | - users (JWT Auth +   |
          | - stops (202 shelter) |                     |   favorite_corridors) |
          | - vehicles (32 live)  |                     +-----------------------+
          | - crowd_reports       |                               |
          +-----------------------+                               v
                    ^                                   [Volume: account_data]
                    |
          +-----------------------+
          | Anti-Corruption Layer |  <-- Metro Jabar Trans Live API (15 dtk)
          |  telemetry_worker.py  |  <-- Open-Meteo Cuaca Bandung
          |  sync_mjt_bandung.py  |
          +-----------------------+
```

### Bounded Context yang Diimplementasikan
1. **Jaringan Rute (`corridors`, `stops`)**: Menyimpan 8 koridor aktif Metro Jabar Trans (`K1`–`K6`, `FD-1`, `FD-2`) lengkap dengan warna rute, *encoded polyline*, tarif, jam operasional, atribut `student_friendly`, serta 202 shelter resmi berklasifikasi zona (`tourism`, `campus`, `general`).
2. **Pemantauan Armada & Estimasi Kedatangan (`vehicles`)**: Menyimpan koordinat GPS live 32 armada bus Metro Jabar Trans (disinkronkan tiap 15 detik), kapasitas maksimal, jumlah penumpang, `load_factor`, status kepadatan tiga warna (`<50%` `GREEN`, `50–80%` `YELLOW`, `>80%` `RED`), `eta_next_stop_min`, dan `headway_min`.
3. **Laporan Warga (`crowd_reports`)**: Menampung laporan lapangan dari komuter (`FULL`, `QUEUE`, `TRAFFIC`), status kepadatan, koordinat GPS pelapor, dan `trust_score`.
4. **Identitas & Akses (`users` & Nginx Gateway)**: Autentikasi pengguna mobile via Bearer JWT, sinkronisasi `favorite_corridors`, serta otorisasi lintas kelompok via header `X-API-Key`.

---

## 2. Daftar Endpoint API Publik

Base URL Publik: **`https://aglio.stei.site/api/v1`** (Indeks Gateway: **`https://aglio.stei.site/api/`**)

| Method | Endpoint | Autentikasi | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Publik | Memeriksa status kesehatan gateway |
| `POST` | `/auth/register` | Publik | Mendaftarkan akun pengguna mobile baru |
| `POST` | `/auth/login` | Publik | Login pengguna untuk memperoleh token JWT |
| `GET` / `PATCH` | `/users/:id` | `Bearer JWT` | Membaca & menyinkronkan `favorite_corridors` pemilik akun |
| `GET` | `/corridors` | `X-API-Key` / `Bearer JWT` | Daftar 8 koridor live ber-polyline (mendukung `?filter=(student_friendly=true)`) |
| `GET` | `/stops` | `X-API-Key` / `Bearer JWT` | Daftar 202 shelter resmi (mendukung `?filter=(zone_tag='tourism')` / `'campus'`) |
| `GET` | `/vehicles` | `X-API-Key` / `Bearer JWT` | Posisi GPS live 32 armada bus, `load_factor`, status `GREEN`/`YELLOW`/`RED`, dan ETA |
| `GET` | `/crowd-reports` | `X-API-Key` / `Bearer JWT` | Daftar laporan warga (`?sort=-created&expand=vehicle,stop`) |
| `POST` | `/crowd-reports` | `X-API-Key` / `Bearer JWT` | Mengirim laporan kepadatan baru dari lapangan |

---

## 3. Akses Lintas Kelompok (Open Host Service)

Setiap permintaan ke endpoint data wajib menyertakan salah satu header autentikasi berikut:
1. **Header `X-API-Key`:**
   - Aplikasi Mobile TransitKu: `transitku-637e9facc71d864b`
   - Mitra Tourism (JejakBandung): `jejakbandung-cf45da6b36ae9000`
   - Mitra Education (LokaCerita): `lokacerita-7a8b9c0d1e2f3a4b`
2. **Pengguna Aplikasi Mobile (`Authorization: Bearer <token>`):**
   - Login pada `POST https://aglio.stei.site/api/v1/auth/login` menggunakan akun demo (`demo@transitku.id` / `transitku123`).

---

## 4. Contoh Request

### Mengambil Posisi & Status Kepadatan Armada Live
```bash
curl -X GET "https://aglio.stei.site/api/v1/vehicles?expand=corridor" \
  -H "X-API-Key: transitku-637e9facc71d864b"
```

### Mencari Shelter di Area Wisata (Mitra JejakBandung)
```bash
curl -X GET "https://aglio.stei.site/api/v1/stops?filter=(zone_tag='tourism')" \
  -H "X-API-Key: jejakbandung-cf45da6b36ae9000"
```

### Mencari Koridor Ramah Pelajar (Mitra LokaCerita)
```bash
curl -X GET "https://aglio.stei.site/api/v1/corridors?filter=(student_friendly=true)" \
  -H "X-API-Key: lokacerita-7a8b9c0d1e2f3a4b"
```

---

## 5. Panduan Deployment Backend di STB

1. Salin `.env.example` menjadi `.env` dan isi `TUNNEL_TOKEN` Cloudflare.
2. Jalankan kontainer microservice:
   ```bash
   docker compose up -d --build
   ```
3. Sinkronkan skema PocketBase dan data live Metro Jabar Trans:
   ```bash
   python3 update_schema_and_seed.py
   python3 sync_mjt_bandung.py
   ```
4. Jalankan worker telemetri live di background:
   ```bash
   nohup python3 telemetry_worker.py > telemetry_worker.log 2>&1 </dev/null &
   ```
5. Nyalakan Cloudflare Tunnel permanen:
   ```bash
   docker compose --profile tunnel up -d
   ```

---

## 6. Aplikasi Mobile (`mobile/`)

Aplikasi mobile **TransitKu** (React Native + Expo TypeScript + Expo Router) berada pada direktori [`mobile/`](mobile/) dan seluruh permintaan API-nya terpusat melalui **`https://aglio.stei.site/api/v1`**.

Lihat dokumentasi lengkap layar, peta live OpenStreetMap, GPS Kota Bandung, dan struktur folder pada [`mobile/README.md`](mobile/README.md) serta laporan deliverables pada [`mobile/docs/TransitKu_Dokumentasi_Deliverables.pdf`](mobile/docs/TransitKu_Dokumentasi_Deliverables.pdf).

```bash
cd mobile
npm install
npx expo start -c
```
