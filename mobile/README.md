# TransitKu Mobile App (React Native + Expo)

Aplikasi mobile pemantau posisi armada dan tingkat kepadatan transportasi publik real-time di Kota Bandung, dibangun menggunakan **React Native**, **Expo (TypeScript)**, dan **Expo Router**. Seluruh data disajikan melalui microservice API Gateway **`https://aglio.stei.site/api/v1`** yang terhubung ke data live **Metro Jabar Trans** (`8` koridor aktif, `202` shelter resmi, `32` armada bus live).

---

## Fitur Utama

1. **Beranda (`app/(tabs)/index.tsx`)**
   - Validasi batasan wilayah Kota Bandung (`-6.97` s/d `-6.84` LS, `107.54` s/d `107.72` BT) menggunakan `expo-location` disertai peringatan otomatis bila GPS pengguna berada di luar Bandung.
   - Menampilkan **Halte Terdekat** (diurutkan berdasarkan jarak Haversine dari GPS pengguna), **Koridor Favorit** (rute harian rumah–kantor/kampus), dan ringkasan **Pantauan Peta & Armada Aktif**.

2. **Koridor & Peta (`app/(tabs)/corridors.tsx`, `app/corridor/[id].tsx`)**
   - **Peta Live OpenStreetMap** (`src/components/BandungLiveMap.tsx`) menggunakan Leaflet + `react-native-webview` dengan garis rute berwarna resmi Metro Jabar Trans (*encoded polyline*), marker shelter, posisi GPS pengguna, dan marker bus live berwarna (`GREEN`/`YELLOW`/`RED`) yang tersinkron otomatis setiap 15 detik.
   - Filter moda **Bus Kota (Live)** (8 koridor Metro Jabar Trans: `K1`–`K6`, `FD-1`, `FD-2`) + toggle **Ramah Pelajar**, serta tab **KRL** dan **Angkot** berstatus *Segera hadir*.
   - Halaman **Detail Koridor** menampilkan peta live koridor, urutan shelter resmi, posisi armada real-time (`load_factor`, badge warna, ETA), **kartu rekomendasi armada berikutnya + selisih `headway_min`** apabila armada terdekat berstatus `RED`, serta tombol **Pengingat Keberangkatan** sebelum armada `GREEN` tiba.

3. **Laporan Warga (`app/(tabs)/reports.tsx`)**
   - Menampilkan daftar laporan tervalidasi lengkap dengan jenis laporan (`FULL`, `QUEUE`, `TRAFFIC`) dan **skor kepercayaan (`trust_score`)**.
   - Formulir kirim laporan cepat (`CrowdReportModal.tsx`) dengan pengambilan koordinat GPS perangkat otomatis ke `POST /crowd-reports`.

4. **Akun & Sinkronisasi Favorit (`app/(tabs)/account.tsx`)**
   - Form **Login** (`POST /auth/login`), **Register** (`POST /auth/register`), tombol isi cepat **Gunakan Akun Demo** (`demo@transitku.id` / `transitku123`), sinkronisasi **Koridor Favorit** ke server (`PATCH /users/:id`), dan **Logout**.

---

## Struktur Proyek

```text
mobile/
├── app/
│   ├── _layout.tsx               # Root Stack + AuthProvider
│   ├── +not-found.tsx            # Halaman fallback rute tidak ditemukan
│   ├── corridor/
│   │   └── [id].tsx              # Detail koridor, peta live, rekomendasi & pengingat
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom Tabs Navigator (4 tab)
│       ├── index.tsx             # Tab 1: Beranda (GPS Bandung, Halte Terdekat, Favorit)
│       ├── corridors.tsx         # Tab 2: Koridor & Peta (OSM Live Map + Filter Moda)
│       ├── reports.tsx           # Tab 3: Laporan Warga (Trust Score + Form GPS)
│       └── account.tsx           # Tab 4: Akun (Login, Register, Favorit, Logout)
└── src/
    ├── components/               # Komponen UI modular (StyleSheet standar)
    │   ├── BandungLiveMap.tsx
    │   ├── CorridorCard.tsx
    │   ├── CrowdReportCard.tsx
    │   ├── CrowdReportModal.tsx
    │   ├── CrowdStatusBadge.tsx
    │   ├── EmptyState.tsx
    │   ├── ErrorState.tsx
    │   ├── FilterChips.tsx
    │   ├── LoadingState.tsx
    │   ├── StopCard.tsx
    │   └── VehicleCard.tsx
    ├── context/
    │   └── AuthContext.tsx       # State autentikasi & sinkronisasi koridor favorit
    ├── services/
    │   ├── api.ts                # Konfigurasi Axios + interceptor X-API-Key & Bearer JWT
    │   ├── authService.ts        # Login, Register, Logout, sinkronisasi favorit
    │   ├── locationService.ts    # Wrapper expo-location & batasan wilayah Bandung
    │   ├── notificationService.ts# Pengingat keberangkatan lokal (lazy expo-notifications)
    │   └── transitService.ts     # Pemanggilan endpoint corridors, stops, vehicles, reports
    ├── theme/
    │   └── tokens.ts             # Token warna, spasi, radius, dan tipografi
    ├── types/
    │   └── transit.ts            # Tipe TypeScript sesuai skema PocketBase
    └── utils/
        ├── format.ts             # Formatter Rupiah, koordinat, label status & waktu
        └── geo.ts                # Perhitungan jarak Haversine & batas Kota Bandung
```

---

## Konfigurasi API Microservice

Seluruh komunikasi jaringan terpusat di `src/services/api.ts`:

- **Base URL:** `https://aglio.stei.site/api/v1`
- **Header Wajib:** `X-API-Key: transitku-637e9facc71d864b`
- **Header Sesi Login:** `Authorization: Bearer <token>` (otomatis dari `AsyncStorage`)

| Method | Endpoint | Kegunaan |
| :--- | :--- | :--- |
| `GET` | `/health` | Cek status kesehatan API Gateway |
| `POST` | `/auth/login` | Login pengguna dan memperoleh token JWT |
| `POST` | `/auth/register` | Registrasi akun pengguna mobile baru |
| `GET` / `PATCH` | `/users/:id` | Membaca & menyinkronkan `favorite_corridors` pengguna |
| `GET` | `/corridors` | Daftar koridor live beserta `color` & `polyline` (mendukung filter `mode` & `student_friendly`) |
| `GET` | `/corridors/:id` | Detail satu koridor |
| `GET` | `/stops` | Daftar 202 shelter resmi (mendukung filter `zone_tag` & `corridor`, `sort=sequence`) |
| `GET` | `/vehicles?expand=corridor` | Posisi GPS live 32 armada bus, `load_factor`, warna status, ETA, dan relasi koridor |
| `GET` / `POST` | `/crowd-reports` | Daftar dan pengiriman laporan warga (`FULL`, `QUEUE`, `TRAFFIC`, `trust_score`, GPS) |

---

## Cara Menjalankan

```bash
cd mobile
npm install
npx expo start -c
```

Pengecekan TypeScript & kompatibilitas SDK:

```bash
cd mobile
npx tsc --noEmit
npx expo install --check
```

### Akun Demo Uji Coba
- **Email:** `demo@transitku.id`
- **Password:** `transitku123`
