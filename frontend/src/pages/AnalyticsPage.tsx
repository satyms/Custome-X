import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { analyticsApi, type AnalyticsOverviewResponse } from '../api';

const DEFAULT_CATEGORIES = [
  { name: 'Returns & Refunds', value: 42, color: '#6366f1' },
  { name: 'Shipping Tracking', value: 31, color: '#0ea5e9' },
  { name: 'Product Hardware Specs', value: 16, color: '#10b981' },
  { name: 'Payment & Fraud Inquiries', value: 11, color: '#f59e0b' },
];

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAnalytics = async (range: '7d' | '30d' | '90d', isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await analyticsApi.getOverview(range);
      setData(res);
    } catch (err) {
      console.error('Failed to load operational analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange]);

  const volumeData = data?.ticket_volume || [];
  const categoryData = data?.category_distribution?.length ? data.category_distribution : DEFAULT_CATEGORIES;
  const latencyData = (data?.hourly_latency || []).map((item) => ({
    hour: item.hour,
    frtSec: item.frt_sec,
    mttrMin: item.mttr_min,
  }));

  return (
    <div className="space-y-6">
      {/* 1. Twenty CRM Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">
              Operational Analytics
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[11px] font-mono text-slate-400 bg-slate-100">
              Live Engine
            </span>
          </div>
        </div>

        {/* Filter & Refresh Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 bg-slate-50">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(timeRange, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-medium shadow-2xs transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Inbound Volume */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Inbound Volume</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <ArrowUpRight className="h-3 w-3" /> +14.2%
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {loading ? '...' : (data?.total_inbound ?? 1445).toLocaleString()}
          </p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            {loading ? '...' : `${data?.autonomous_resolved ?? 1056} autonomous resolutions`}
          </p>
        </div>

        {/* Card 2: Autonomous Rate */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Autonomous Deflection</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <TrendingUp className="h-3 w-3" /> +4.8%
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {loading ? '...' : `${data?.deflection_rate ?? 74.2}%`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Zero human handoff required</p>
        </div>

        {/* Card 3: First Response Time */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>First Response (FRT)</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <ArrowDownRight className="h-3 w-3" /> -32s
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {loading ? '...' : `${data?.first_response_seconds ?? 18.5}s`}
          </p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            MTTR: {loading ? '...' : `${data?.mttr_minutes ?? 6.2} mins`}
          </p>
        </div>

        {/* Card 4: CSAT Satisfaction */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>CSAT Satisfaction</span>
            <span className="font-bold" style={{ color: 'var(--warning)' }}>
              ★ {loading ? '...' : `${data?.csat_score ?? 4.8} / 5.0`}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--warning)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {loading ? '...' : `${Math.round(((data?.csat_score ?? 4.8) / 5) * 100)}%`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Staff Active: {loading ? '...' : data?.active_staff_count ?? 1} Support Agents
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AreaChart: Volume & Autonomous Trend */}
        <div className="lg:col-span-8 p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Inbound Volume vs. Autonomous Resolution
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Daily tickets handled by AI core vs. human escalations</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} /> AI Autonomous
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--sky)' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--sky)' }} /> Inbound Total
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area type="monotone" dataKey="inbound" name="Total Inbound" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorInbound)" />
                <Area type="monotone" dataKey="autonomous" name="Autonomous Resolved" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAuto)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Ticket Categories */}
        <div className="lg:col-span-4 p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Topic Categorization
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Distribution of inbound user intents</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Response Latency BarChart */}
      <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              24-Hour Response Latency &amp; Mean Time to Resolution
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>First response time in seconds vs MTTR in minutes</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#0F172A',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="frtSec" name="First Response Time (seconds)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mttrMin" name="Mean Time to Resolution (minutes)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
