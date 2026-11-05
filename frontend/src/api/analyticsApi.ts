import apiClient from './client';

export interface TicketVolumePoint {
  day: string;
  inbound: number;
  autonomous: number;
  escalated: number;
}

export interface CategoryDistributionPoint {
  name: string;
  value: number;
  color: string;
}

export interface HourlyLatencyPoint {
  hour: string;
  frt_sec: number;
  mttr_min: number;
}

export interface AnalyticsOverviewResponse {
  time_range: string;
  deflection_rate: number;
  mttr_minutes: number;
  first_response_seconds: number;
  csat_score: number;
  total_inbound: number;
  autonomous_resolved: number;
  human_escalated: number;
  active_staff_count: number;
  ticket_volume: TicketVolumePoint[];
  category_distribution: CategoryDistributionPoint[];
  hourly_latency: HourlyLatencyPoint[];
}

export const analyticsApi = {
  getOverview: async (timeRange: '7d' | '30d' | '90d' = '7d'): Promise<AnalyticsOverviewResponse> => {
    const response = await apiClient.get<AnalyticsOverviewResponse>('/analytics/overview', {
      params: { time_range: timeRange },
    });
    return response.data;
  },

  getVolume: async (timeRange: '7d' | '30d' | '90d' = '7d'): Promise<TicketVolumePoint[]> => {
    const response = await apiClient.get<TicketVolumePoint[]>('/analytics/volume', {
      params: { time_range: timeRange },
    });
    return response.data;
  },
};

export default analyticsApi;
