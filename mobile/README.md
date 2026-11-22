# TransitKu Mobile App (React Native + Expo)

Aplikasi mobile sistem informasi transportasi publik terintegrasi untuk wilayah Bandung (Trans Metro Pasundan dan Angkot), dibangun menggunakan **React Native**, **Expo (TypeScript)**, dan **Expo Router**. Aplikasi ini terhubung langsung ke microservice backend TransitKu (`https://aglio.stei.site/api/v1`).

---

## Fitur Utama

1. **Koridor & Detail Rute (`app/(tabs)/index.tsx`, `app/corridor/[id].tsx`)**
   - Menampilkan daftar koridor Trans Metro Pasundan dan Angkot beserta kode rute, nama koridor, asal–tujuan, jam operasional, dan tarif dalam Rupiah.
   - Filter **Semua** dan **Ramah Pelajar** (`GET /corridors?filter=(student_friendly=true)`).
   - Ketuk kartu koridor untuk membuka halaman detail urutan halte (`GET /stops?filter=(corridor='<id>')&sort=sequence`).

2. **Halte & Wisata (`app/(tabs)/stops.tsx`)**
   - Menampilkan daftar halte beserta landmark terdekat dan koordinat GPS (`latitude`, `longitude`).
   - Filter kategori zona: **Semua**, **Wisata** (`tourism`), **Kampus** (`campus`), dan **Umum** (`general`).

3. **Armada & Lapor (`app/(tabs)/vehicles.tsx`)**
   - Memantau telemetri armada real-time (`GET /vehicles?expand=corridor`): plat nomor, jenis kendaraan, koridor, estimasi tiba (`eta_next_stop_min`), jumlah penumpang dibanding kapasitas maksimal, rasio keterisian (`load_factor`), jeda armada (`headway_min`), dan badge warna kepadatan (`GREEN`, `YELLOW`, `RED`).
   - Mendukung tombol **Refresh** manual serta **pull-to-refresh**.
   - Menampilkan daftar laporan kepadatan dari komuter (`GET /crowd-reports`) serta modal formulir untuk mengirim laporan baru (`POST /crowd-reports`).

4. **Akun & Autentikasi JWT (`app/(tabs)/account.tsx`)**
   - Mendukung **Login** (`POST /auth/login`) dan **Register** (`POST /auth/register`).
   - Tersedia tombol isi cepat **Gunakan Akun Demo** (`demo@transitku.id` / `transitku123`).
   - Token JWT dan data profil disimpan persisten menggunakan `AsyncStorage` dan otomatis disisipkan ke header `Authorization: Bearer <token>`.

---

## Struktur Proyek

```text
mobile/
├── app/
│   ├── _layout.tsx               # Root Stack + AuthProvider
│   ├── +not-found.tsx            # Halaman fallback rute tidak ditemukan
│   ├── corridor/
│   │   └── [id].tsx              # Detail koridor & urutan halte
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom Tabs Navigator (4 tab)
│       ├── index.tsx             # Tab 1: Koridor
│       ├── stops.tsx             # Tab 2: Halte & Wisata
│       ├── vehicles.tsx          # Tab 3: Armada & Lapor
│       └── account.tsx           # Tab 4: Akun
└── src/
    ├── components/               # Komponen UI modular (StyleSheet standar)
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
    │   └── AuthContext.tsx       # State autentikasi global
    ├── services/
    │   ├── api.ts                # Konfigurasi Axios + interceptor X-API-Key & Bearer JWT
    │   ├── authService.ts        # Login, Register, Logout, dan persistensi sesi
    │   └── transitService.ts     # Pemanggilan endpoint corridors, stops, vehicles, crowd-reports
    ├── theme/
    │   └── tokens.ts             # Token warna, spasi, radius, dan tipografi
    ├── types/
    │   └── transit.ts            # Definisi tipe TypeScript sesuai skema PocketBase
    └── utils/
        └── format.ts             # Formatter tarif Rupiah, koordinat, label zona & waktu
```

---

## Konfigurasi API

Seluruh komunikasi jaringan terpusat di `src/services/api.ts`:

- **Base URL:** `https://aglio.stei.site/api/v1`
- **Header Wajib:** `X-API-Key: transitku-637e9facc71d864b` (otomatis pada setiap request)
- **Header Opsional:** `Authorization: Bearer <token>` (otomatis jika pengguna sudah login)

### Ringkasan Endpoint yang Digunakan

| Method | Endpoint | Kegunaan |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Login pengguna dan mendapatkan token JWT |
| `POST` | `/auth/register` | Registrasi akun pengguna mobile baru |
| `GET` | `/corridors` | Daftar koridor (mendukung `?filter=(student_friendly=true)`) |
| `GET` | `/corridors/:id` | Detail satu koridor |
| `GET` | `/stops` | Daftar halte (mendukung `?filter=(zone_tag='...')` dan `?filter=(corridor='...')&sort=sequence`) |
| `GET` | `/vehicles?expand=corridor` | Daftar armada real-time beserta relasi koridor |
| `GET` | `/crowd-reports` | Daftar laporan kepadatan dari komuter |
| `POST` | `/crowd-reports` | Mengirim laporan kepadatan baru dari lapangan |

---

## Cara Menjalankan

### Prasyarat
- Node.js (disarankan v20+)
- Aplikasi **Expo Go** di perangkat Android/iOS (atau Android Emulator / iOS Simulator)

### Langkah Instalasi & Menjalankan

```bash
cd mobile
npm install
npx expo start
```

Untuk membersihkan cache bundler Metro jika diperlukan:

```bash
npx expo start -c
```

### Pengecekan TypeScript

```bash
cd mobile
npx tsc --noEmit
```

### Akun Demo Uji Coba
- **Email:** `demo@transitku.id`
- **Password:** `transitku123`
