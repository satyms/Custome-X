import React, { useState } from 'react';
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
} from 'lucide-react';

const TICKET_VOLUME_DATA = [
  { day: 'Mon', inbound: 180, autonomous: 124, escalated: 18 },
  { day: 'Tue', inbound: 210, autonomous: 152, escalated: 22 },
  { day: 'Wed', inbound: 245, autonomous: 178, escalated: 25 },
  { day: 'Thu', inbound: 290, autonomous: 215, escalated: 31 },
  { day: 'Fri', inbound: 260, autonomous: 190, escalated: 28 },
  { day: 'Sat', inbound: 140, autonomous: 105, escalated: 12 },
  { day: 'Sun', inbound: 120, autonomous: 92, escalated: 10 },
];

const CATEGORY_DISTRIBUTION = [
  { name: 'Returns & Refunds', value: 42, color: '#6366f1' },
  { name: 'Shipping Tracking', value: 31, color: '#0ea5e9' },
  { name: 'Product Hardware Specs', value: 16, color: '#10b981' },
  { name: 'Payment & Fraud Inquiries', value: 11, color: '#f59e0b' },
];

const HOURLY_LATENCY_DATA = [
  { hour: '00:00', frtSec: 12, mttrMin: 4.2 },
  { hour: '04:00', frtSec: 14, mttrMin: 3.8 },
  { hour: '08:00', frtSec: 28, mttrMin: 8.5 },
  { hour: '12:00', frtSec: 34, mttrMin: 9.1 },
  { hour: '16:00', frtSec: 24, mttrMin: 6.4 },
  { hour: '20:00', frtSec: 18, mttrMin: 4.9 },
];

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Operational Analytics
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              Live BI Engine
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time support operations, autonomous resolution performance, and response latency.
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: timeRange === range ? 'var(--accent)' : 'transparent',
                color: timeRange === range ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Inbound Volume</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <ArrowUpRight className="h-3 w-3" /> +14.2%
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>1,445</p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>1,056 autonomous resolutions</p>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Autonomous Rate</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <ArrowUpRight className="h-3 w-3" /> +4.8%
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif" }}>73.1%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Zero human handoff required</p>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>First Response (FRT)</span>
            <span className="flex items-center font-semibold gap-0.5" style={{ color: 'var(--success)' }}>
              <ArrowDownRight className="h-3 w-3" /> -32s
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)', fontFamily: "'Space Grotesk', sans-serif" }}>22.4 sec</p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>Industry average: 3.5 mins</p>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>CSAT Satisfaction</span>
            <span className="font-bold" style={{ color: 'var(--warning)' }}>★ 4.85 / 5.0</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--warning)', fontFamily: "'Space Grotesk', sans-serif" }}>97.0%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>680 post-chat customer reviews</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AreaChart: Volume & Autonomous Trend */}
        <div className="lg:col-span-8 p-5 rounded-xl border shadow-sm space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
              <AreaChart data={TICKET_VOLUME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        <div className="lg:col-span-4 p-5 rounded-xl border shadow-sm space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
                  data={CATEGORY_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_DISTRIBUTION.map((entry, index) => (
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
            {CATEGORY_DISTRIBUTION.map((cat) => (
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
      <div className="p-5 rounded-xl border shadow-sm space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
            <BarChart data={HOURLY_LATENCY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
