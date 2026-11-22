export type ZoneTag = 'tourism' | 'campus' | 'general';

export type CrowdStatus = 'GREEN' | 'YELLOW' | 'RED';

export type TransportMode = 'Bus Kota' | 'KRL' | 'Angkot';

export type ReportType = 'FULL' | 'QUEUE' | 'TRAFFIC';

export interface PocketBaseListResponse<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export interface Corridor {
  id: string;
  code: string;
  name: string;
  mode?: TransportMode;
  origin: string;
  destination: string;
  fare: number;
  operating_hours: string;
  student_friendly: boolean;
  color?: string;
  polyline?: string;
}

export interface Stop {
  id: string;
  name: string;
  corridor: string;
  sequence: number;
  latitude: number;
  longitude: number;
  zone_tag: ZoneTag;
  nearby_landmark: string;
  facilities?: string;
  expand?: {
    corridor?: Corridor;
  };
}

export interface Vehicle {
  id: string;
  plate_number: string;
  corridor: string;
  vehicle_type: string;
  latitude: number;
  longitude: number;
  capacity_max: number;
  passenger_count: number;
  load_factor: number;
  crowd_status: CrowdStatus;
  eta_next_stop_min: number;
  headway_min: number;
  expand?: {
    corridor?: Corridor;
  };
}

export interface CrowdReport {
  id: string;
  vehicle: string;
  stop: string;
  reporter_name: string;
  report_type?: ReportType;
  reported_status: CrowdStatus;
  latitude?: number;
  longitude?: number;
  trust_score?: number;
  note: string;
  is_verified: boolean;
  created: string;
  expand?: {
    vehicle?: Vehicle;
    stop?: Stop;
  };
}

export interface CreateCrowdReportPayload {
  vehicle: string;
  stop?: string;
  reporter_name: string;
  report_type: ReportType;
  reported_status: CrowdStatus;
  latitude?: number;
  longitude?: number;
  trust_score?: number;
  note: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  favorite_corridors?: string[];
  verified?: boolean;
  created?: string;
}

export interface LoginPayload {
  identity: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  record: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}
