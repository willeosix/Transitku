import * as Location from 'expo-location';
import { isWithinBandungBounds } from '../utils/geo';

export interface DeviceLocationResult {
  status: 'granted' | 'denied' | 'error';
  latitude?: number;
  longitude?: number;
  inBandung: boolean;
  message?: string;
}

export async function getCurrentBandungLocation(): Promise<DeviceLocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        status: 'denied',
        inBandung: true,
        message: 'Izin lokasi belum diberikan. Aktifkan GPS untuk melihat halte terdekat di Bandung',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;
    const inBandung = isWithinBandungBounds(latitude, longitude);

    return {
      status: 'granted',
      latitude,
      longitude,
      inBandung,
      message: inBandung
        ? undefined
        : 'Posisi Anda terdeteksi di luar wilayah layanan Kota Bandung (-6.97 s/d -6.84 LS, 107.54 s/d 107.72 BT)',
    };
  } catch {
    return {
      status: 'error',
      inBandung: true,
      message: 'Gagal membaca GPS perangkat. Menampilkan data wilayah Kota Bandung',
    };
  }
}
