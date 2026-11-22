# TransitKu Microservice Backend (Tugas Besar II3160 TST x II3140 PWAM)

**Kelompok Aglio**
- Christian Wilfredo Pakpahan (18224038) - Backend & Domain Architecture (TST)
- Nicholas Putra Halim (18224098) - Mobile Application Developer (PWAM)

---

## 1. Arsitektur Sistem

TransitKu menerapkan pola arsitektur **Microservice dengan Database-per-Service** dan **API Gateway** yang di-deploy di atas Set-Top Box (STB) Armbian ARM64 menggunakan Docker Compose. Seluruh lalu lintas publik dialirkan melalui Cloudflare Tunnel berbasis HTTPS tanpa membuka port lokal ke internet.

```
[Aplikasi Mobile PWAM / Kelompok Mitra]
                 |
                 | HTTPS (Cloudflare Tunnel)
                 v
     +-----------------------+
     |  API Gateway (Nginx)  |  --> Rate Limiting (10 req/s) + Validasi X-API-Key / JWT
     +-----------------------+
          |             |
          |             +-------------------------------+
          v                                             v
+-----------------------+                     +-----------------------+
|   transit-service     |                     |   account-service     |
|     (PocketBase)      |                     |     (PocketBase)      |
| - corridors           |                     | - users (JWT Auth)    |
| - stops               |                     +-----------------------+
| - vehicles            |                               |
| - crowd_reports       |                               v
+-----------------------+                     [Volume: account_data]
          |
          v
[Volume: transit_data]
```

### Bounded Context yang Diimplementasikan
1. **Fleet & Telemetry Context (`vehicles`)**: Menyimpan koordinat GPS real-time armada, kapasitas maksimal, jumlah penumpang, rasio keterisian (`load_factor`), status kepadatan tiga warna (`GREEN`, `YELLOW`, `RED`), estimasi waktu tiba (`eta_next_stop_min`), serta jeda armada berikutnya (`headway_min`).
2. **Route & Stop Management Context (`corridors`, `stops`)**: Mengelola data master koridor trayek beserta titik halte dengan klasifikasi zona (`tourism`, `campus`, `general`) untuk mendukung integrasi lintas tema dengan kelompok Tourism dan Education.
3. **Commuter Crowd-Report Context (`crowd_reports`)**: Menampung laporan validasi kepadatan lapangan langsung dari pengguna.
4. **Identity & Access Context (`users` & Nginx Gateway)**: Menyediakan autentikasi pengguna aplikasi via Bearer JWT serta otorisasi integrasi antar-kelompok via header `X-API-Key`.

---

## 2. Daftar Endpoint API

Base URL Publik: `https://transitku.stei.fun/api/v1` (atau `.stei.site` sesuai kelas)

| Method | Endpoint | Autentikasi | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Publik | Memeriksa status kesehatan gateway |
| `POST` | `/auth/register` | Publik | Mendaftarkan akun pengguna mobile baru |
| `POST` | `/auth/login` | Publik | Login pengguna untuk memperoleh token JWT |
| `GET` | `/corridors` | `X-API-Key` / `Bearer JWT` | Mengambil daftar koridor rute (mendukung `?filter=(student_friendly=true)`) |
| `GET` | `/stops` | `X-API-Key` / `Bearer JWT` | Mengambil daftar halte (mendukung `?filter=(zone_tag='tourism')`) |
| `GET` | `/vehicles` | `X-API-Key` / `Bearer JWT` | Mengambil posisi armada real-time, `load_factor`, status `GREEN`/`YELLOW`/`RED`, dan ETA |
| `GET` | `/crowd-reports` | `X-API-Key` / `Bearer JWT` | Mengambil daftar laporan kepadatan dari komuter |
| `POST` | `/crowd-reports` | `X-API-Key` / `Bearer JWT` | Mengirim laporan kepadatan baru dari lapangan |

---

## 3. Cara Mendapatkan Akses (Untuk Kelompok Mitra)

Setiap permintaan ke endpoint data wajib menyertakan salah satu header autentikasi berikut:
1. **Server-to-Server (Kelompok Mitra):**
   Tambahkan header `X-API-Key` dengan kunci API berikut:
   - Kunci Mitra JejakBandung (Tourism): `jejakbandung-cf45da6b36ae9000`
   - Kunci Mitra Lintas Kelompok: `transitku-637e9facc71d864b`
   - Kunci Uji Publik: `aglio-transitku-public-2026`
2. **Pengguna Aplikasi Mobile:**
   Lakukan login pada `POST /api/v1/auth/login` menggunakan akun uji (`demo@transitku.id` / `transitku123`), lalu kirimkan header `Authorization: Bearer <token>`.

---

## 4. Contoh Request & Response

### Mengambil Posisi & Status Kepadatan Armada
```bash
curl -X GET "https://transitku.stei.fun/api/v1/vehicles?expand=corridor" \
  -H "X-API-Key: aglio-transitku-public-2026"
```

### Mencari Halte di Area Wisata (Integrasi Kelompok Tourism)
```bash
curl -X GET "https://transitku.stei.fun/api/v1/stops?filter=(zone_tag='tourism')" \
  -H "X-API-Key: jejakbandung-cf45da6b36ae9000"
```

### Mencari Koridor Ramah Pelajar (Integrasi Kelompok Education)
```bash
curl -X GET "https://transitku.stei.fun/api/v1/corridors?filter=(student_friendly=true)" \
  -H "X-API-Key: transitku-637e9facc71d864b"
```

### Mengirim Laporan Kepadatan Penumpang
```bash
curl -X POST "https://transitku.stei.fun/api/v1/crowd-reports" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aglio-transitku-public-2026" \
  -d '{
    "vehicle": "<ID_VEHICLE>",
    "reporter_name": "Komuter Bandung",
    "reported_status": "YELLOW",
    "note": "Penumpang mulai padat di area tengah bus"
  }'
```

---

## 5. Panduan Deployment di STB

1. Salin berkas `.env.example` menjadi `.env` dan isi `TUNNEL_TOKEN` dari dashboard Cloudflare kelas.
2. Jalankan kontainer microservice dengan pembatasan memori dan CPU:
   ```bash
   docker compose up -d --build
   ```
3. Buat akun superuser pada kedua service PocketBase:
   ```bash
   docker compose exec transit-service pocketbase superuser upsert admin@transitku.id bukan123456 --dir=/pb_data
   docker compose exec account-service pocketbase superuser upsert admin@transitku.id bukan123456 --dir=/pb_data
   ```
4. Impor berkas skema `pb_schema/transit_collections.json` melalui dashboard admin `transit-service`.
5. Jalankan skrip pengisian data awal:
   ```bash
   sh seed_transitku.sh
   ```
6. Nyalakan Cloudflare Tunnel permanen:
   ```bash
   docker compose --profile tunnel up -d
   ```
