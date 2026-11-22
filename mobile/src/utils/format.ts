import { CrowdStatus, ZoneTag } from '../types/transit';

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
}

export function formatCoordinates(lat: number, lng: number): string {
  const safeLat = Number.isFinite(lat) ? lat.toFixed(4) : '0.0000';
  const safeLng = Number.isFinite(lng) ? lng.toFixed(4) : '0.0000';
  return `${safeLat}, ${safeLng}`;
}

export function formatZoneLabel(tag: ZoneTag): string {
  switch (tag) {
    case 'tourism':
      return 'Wisata';
    case 'campus':
      return 'Kampus';
    default:
      return 'Umum';
  }
}

export function formatCrowdLabel(status: CrowdStatus): string {
  switch (status) {
    case 'GREEN':
      return 'Longgar';
    case 'YELLOW':
      return 'Sedang';
    case 'RED':
      return 'Padat';
  }
}

export function formatReportTime(isoString?: string): string {
  if (!isoString) {
    return 'Baru saja';
  }
  const parsed = new Date(isoString.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return 'Baru saja';
  }
  const hours = parsed.getHours().toString().padStart(2, '0');
  const minutes = parsed.getMinutes().toString().padStart(2, '0');
  const day = parsed.getDate().toString().padStart(2, '0');
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}
