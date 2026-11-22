#!/bin/sh
set -e

TRANSIT_URL="http://localhost:8093"
ACCOUNT_URL="http://localhost:8094"
GATEWAY_URL="http://localhost/api/v1"

echo "1. Login superuser transit-service..."
TOKEN=$(curl -s -X POST "$TRANSIT_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@transitku.id","password":"bukan123456"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Gagal login superuser. Pastikan superuser admin@transitku.id sudah dibuat."
  exit 1
fi

echo "2. Menambahkan data Koridor Bandung..."
C1=$(curl -s -X POST "$TRANSIT_URL/api/collections/corridors/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d '{"code":"TMP-K1","name":"Trans Metro Pasundan Koridor 1","origin":"Leuwipanjang","destination":"Soreang","fare":4900,"operating_hours":"05:00 - 21:00 WIB","student_friendly":false}' | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

C2=$(curl -s -X POST "$TRANSIT_URL/api/collections/corridors/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d '{"code":"TMP-K2","name":"Trans Metro Pasundan Koridor 2","origin":"Kota Baru Parahyangan","destination":"Alun-Alun Bandung","fare":4900,"operating_hours":"05:00 - 21:00 WIB","student_friendly":true}' | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

C3=$(curl -s -X POST "$TRANSIT_URL/api/collections/corridors/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d '{"code":"ANG-05","name":"Angkot Kalapa - Dago (via ITB)","origin":"Abdul Muis (Kebon Kalapa)","destination":"Terminal Dago","fare":5000,"operating_hours":"05:30 - 22:00 WIB","student_friendly":true}' | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

echo "Koridor IDs: $C1, $C2, $C3"

echo "3. Menambahkan data Halte (Stops) untuk integrasi Tourism & Education..."
S1=$(curl -s -X POST "$TRANSIT_URL/api/collections/stops/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"name\":\"Halte Alun-Alun Bandung\",\"corridor\":\"$C2\",\"sequence\":12,\"latitude\":-6.9218,\"longitude\":107.6071,\"zone_tag\":\"tourism\",\"nearby_landmark\":\"Masjid Raya Bandung & Jalan Asia Afrika\"}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

S2=$(curl -s -X POST "$TRANSIT_URL/api/collections/stops/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"name\":\"Halte Gedung Sate\",\"corridor\":\"$C3\",\"sequence\":8,\"latitude\":-6.9025,\"longitude\":107.6188,\"zone_tag\":\"tourism\",\"nearby_landmark\":\"Museum Gedung Sate & Lapangan Gasibu\"}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

S3=$(curl -s -X POST "$TRANSIT_URL/api/collections/stops/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"name\":\"Halte Gerbang Utama ITB Ganesha\",\"corridor\":\"$C3\",\"sequence\":10,\"latitude\":-6.8932,\"longitude\":107.6104,\"zone_tag\":\"campus\",\"nearby_landmark\":\"Institut Teknologi Bandung (Kampus Ganesha)\"}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

S4=$(curl -s -X POST "$TRANSIT_URL/api/collections/stops/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"name\":\"Halte Stasiun Hall Bandung\",\"corridor\":\"$C2\",\"sequence\":10,\"latitude\":-6.9126,\"longitude\":107.6024,\"zone_tag\":\"general\",\"nearby_landmark\":\"Stasiun Kereta Api Bandung\"}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

echo "4. Menambahkan data Armada Real-Time (Vehicles)..."
V1=$(curl -s -X POST "$TRANSIT_URL/api/collections/vehicles/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"plate_number\":\"D 7501 AA\",\"corridor\":\"$C2\",\"vehicle_type\":\"Bus Kota\",\"latitude\":-6.9150,\"longitude\":107.6040,\"capacity_max\":40,\"passenger_count\":14,\"load_factor\":35,\"crowd_status\":\"GREEN\",\"eta_next_stop_min\":4,\"headway_min\":12}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

V2=$(curl -s -X POST "$TRANSIT_URL/api/collections/vehicles/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"plate_number\":\"D 1924 UD\",\"corridor\":\"$C3\",\"vehicle_type\":\"Angkot\",\"latitude\":-6.8980,\"longitude\":107.6145,\"capacity_max\":12,\"passenger_count\":8,\"load_factor\":67,\"crowd_status\":\"YELLOW\",\"eta_next_stop_min\":3,\"headway_min\":5}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

V3=$(curl -s -X POST "$TRANSIT_URL/api/collections/vehicles/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"plate_number\":\"D 7508 AA\",\"corridor\":\"$C1\",\"vehicle_type\":\"Bus Kota\",\"latitude\":-6.9482,\"longitude\":107.5931,\"capacity_max\":40,\"passenger_count\":38,\"load_factor\":95,\"crowd_status\":\"RED\",\"eta_next_stop_min\":2,\"headway_min\":10}" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

echo "5. Menambahkan data Laporan Kepadatan Penumpang (Crowd Reports)..."
curl -s -X POST "$TRANSIT_URL/api/collections/crowd_reports/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"vehicle\":\"$V1\",\"stop\":\"$S1\",\"reporter_name\":\"Raka Komuter\",\"reported_status\":\"GREEN\",\"note\":\"Armada baru berangkat dari Stasiun Hall, kursi masih banyak kosong.\",\"is_verified\":true}" > /dev/null

curl -s -X POST "$TRANSIT_URL/api/collections/crowd_reports/records" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"vehicle\":\"$V3\",\"stop\":\"$S1\",\"reporter_name\":\"Nadia Mahasiswa\",\"reported_status\":\"RED\",\"note\":\"Bus penuh sesak jam pulang kerja, disarankan tunggu armada berikutnya 10 menit lagi.\",\"is_verified\":true}" > /dev/null

echo "6. Membuat akun demo pengguna mobile (demo@transitku.id)..."
curl -s -X POST "$GATEWAY_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Komuter ITB","email":"demo@transitku.id","password":"transitku123","passwordConfirm":"transitku123"}' > /dev/null

echo "Seeding selesai! Menguji endpoint /api/v1/vehicles dengan X-API-Key..."
curl -s -H "X-API-Key: aglio-transitku-public-2026" "$GATEWAY_URL/vehicles" | head -c 300
echo ""
