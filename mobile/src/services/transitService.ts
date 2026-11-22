import axios from 'axios';
import { api } from './api';
import {
  Corridor,
  CreateCrowdReportPayload,
  CrowdReport,
  PocketBaseListResponse,
  Stop,
  TransportMode,
  Vehicle,
  ZoneTag,
} from '../types/transit';

export interface CorridorQueryOptions {
  studentFriendlyOnly?: boolean;
  mode?: TransportMode;
}

export async function getCorridors(options?: CorridorQueryOptions): Promise<Corridor[]> {
  const filters: string[] = [];
  if (options?.studentFriendlyOnly) {
    filters.push('(student_friendly=true)');
  }
  if (options?.mode) {
    filters.push(`(mode='${options.mode}')`);
  }
  const params = filters.length > 0 ? { filter: filters.join(' && '), perPage: 50 } : { perPage: 50 };
  const response = await api.get<PocketBaseListResponse<Corridor>>('/corridors', { params });
  return response.data.items ?? [];
}

export async function getCorridorById(id: string): Promise<Corridor> {
  const response = await api.get<Corridor>(`/corridors/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getStops(zoneTag?: ZoneTag): Promise<Stop[]> {
  const params: Record<string, string | number> = { perPage: 200, sort: 'sequence' };
  if (zoneTag) {
    params.filter = `(zone_tag='${zoneTag}')`;
  }
  const response = await api.get<PocketBaseListResponse<Stop>>('/stops', { params });
  return response.data.items ?? [];
}

export async function getStopsByCorridor(corridorId: string): Promise<Stop[]> {
  const response = await api.get<PocketBaseListResponse<Stop>>('/stops', {
    params: {
      filter: `(corridor='${corridorId}')`,
      sort: 'sequence',
      perPage: 100,
    },
  });
  return response.data.items ?? [];
}

export async function getVehicles(): Promise<Vehicle[]> {
  const response = await api.get<PocketBaseListResponse<Vehicle>>('/vehicles', {
    params: {
      expand: 'corridor',
      perPage: 100,
    },
  });
  return response.data.items ?? [];
}

export async function getVehiclesByCorridor(corridorId: string): Promise<Vehicle[]> {
  const response = await api.get<PocketBaseListResponse<Vehicle>>('/vehicles', {
    params: {
      filter: `(corridor='${corridorId}')`,
      expand: 'corridor',
      sort: 'eta_next_stop_min',
      perPage: 50,
    },
  });
  return response.data.items ?? [];
}

export async function getCrowdReports(): Promise<CrowdReport[]> {
  try {
    const response = await api.get<PocketBaseListResponse<CrowdReport>>('/crowd-reports', {
      params: {
        sort: '-created',
        expand: 'vehicle,stop',
        perPage: 50,
      },
    });
    return response.data.items ?? [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const fallbackResponse = await api.get<PocketBaseListResponse<CrowdReport>>(
        '/crowd-reports',
        {
          params: {
            expand: 'vehicle,stop',
            perPage: 50,
          },
        }
      );
      return fallbackResponse.data.items ?? [];
    }
    throw error;
  }
}

export async function createCrowdReport(
  payload: CreateCrowdReportPayload
): Promise<CrowdReport> {
  const body: Record<string, string | number | boolean> = {
    vehicle: payload.vehicle,
    reporter_name: payload.reporter_name.trim(),
    report_type: payload.report_type,
    reported_status: payload.reported_status,
    note: payload.note.trim(),
    trust_score: payload.trust_score ?? 80,
    is_verified: (payload.trust_score ?? 80) >= 80,
  };

  if (payload.stop) {
    body.stop = payload.stop;
  }
  if (typeof payload.latitude === 'number') {
    body.latitude = payload.latitude;
  }
  if (typeof payload.longitude === 'number') {
    body.longitude = payload.longitude;
  }

  const response = await api.post<CrowdReport>('/crowd-reports', body);
  return response.data;
}
