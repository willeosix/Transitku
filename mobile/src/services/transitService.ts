import axios from 'axios';
import { api } from './api';
import {
  Corridor,
  CreateCrowdReportPayload,
  CrowdReport,
  PocketBaseListResponse,
  Stop,
  Vehicle,
  ZoneTag,
} from '../types/transit';

export async function getCorridors(studentFriendlyOnly = false): Promise<Corridor[]> {
  const params = studentFriendlyOnly ? { filter: '(student_friendly=true)' } : undefined;
  const response = await api.get<PocketBaseListResponse<Corridor>>('/corridors', { params });
  return response.data.items ?? [];
}

export async function getCorridorById(id: string): Promise<Corridor> {
  const response = await api.get<Corridor>(`/corridors/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getStops(zoneTag?: ZoneTag): Promise<Stop[]> {
  const params = zoneTag ? { filter: `(zone_tag='${zoneTag}')` } : undefined;
  const response = await api.get<PocketBaseListResponse<Stop>>('/stops', { params });
  return response.data.items ?? [];
}

export async function getStopsByCorridor(corridorId: string): Promise<Stop[]> {
  const response = await api.get<PocketBaseListResponse<Stop>>('/stops', {
    params: {
      filter: `(corridor='${corridorId}')`,
      sort: 'sequence',
    },
  });
  return response.data.items ?? [];
}

export async function getVehicles(): Promise<Vehicle[]> {
  const response = await api.get<PocketBaseListResponse<Vehicle>>('/vehicles', {
    params: {
      expand: 'corridor',
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
  const body: Record<string, string> = {
    vehicle: payload.vehicle,
    reporter_name: payload.reporter_name.trim(),
    reported_status: payload.reported_status,
    note: payload.note.trim(),
  };

  if (payload.stop) {
    body.stop = payload.stop;
  }

  const response = await api.post<CrowdReport>('/crowd-reports', body);
  return response.data;
}
