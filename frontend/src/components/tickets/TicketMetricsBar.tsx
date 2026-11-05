import React from 'react';
import { Inbox, Clock, AlertTriangle, Layers } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

export interface TicketMetricsBarProps {
  total: number;
  open: number;
  inProgress: number;
  escalated: number;
  isLoading?: boolean;
  selectedStatus?: string;
  onFilterStatus?: (status: string) => void;
}

export const TicketMetricsBar: React.FC<TicketMetricsBarProps> = ({
  total,
  open,
  inProgress,
  escalated,
  isLoading = false,
  selectedStatus = 'all',
  onFilterStatus,
}) => {
  const cards = [
    {
      id: 'all',
      title: 'Total Tickets',
      value: total,
      icon: Layers,
      iconColor: 'var(--accent)',
      iconBg: 'var(--accent-light)',
    },
    {
      id: 'open',
      title: 'Open Tickets',
      value: open,
      icon: Inbox,
      iconColor: 'var(--sky)',
      iconBg: 'var(--sky-light)',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      value: inProgress,
      icon: Clock,
      iconColor: 'var(--warning)',
      iconBg: 'var(--warning-light)',
    },
    {
      id: 'escalated',
      title: 'Escalated / Urgent',
      value: escalated,
      icon: AlertTriangle,
      iconColor: 'var(--danger)',
      iconBg: 'var(--danger-light)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStatus === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterStatus && onFilterStatus(card.id)}
            className="text-left p-5 rounded-xl border transition-all duration-150 cursor-pointer hover:shadow-sm"
            style={{
              background: 'var(--bg-card)',
              borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
              outline: isSelected ? '2px solid var(--accent-light)' : 'none',
              outlineOffset: '1px',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {card.title}
              </span>
              <div className="p-2 rounded-lg" style={{ background: card.iconBg }}>
                <Icon className="h-4 w-4" style={{ color: card.iconColor }} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl md:text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {card.value}
                </span>
              )}

              {total > 0 && !isLoading && card.id !== 'all' && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {Math.round((card.value / total) * 100)}%
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TicketMetricsBar;
