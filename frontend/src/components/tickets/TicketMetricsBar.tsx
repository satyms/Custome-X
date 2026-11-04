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
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      activeBorder: 'border-indigo-500 ring-1 ring-indigo-500',
    },
    {
      id: 'open',
      title: 'Open Tickets',
      value: open,
      icon: Inbox,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      activeBorder: 'border-sky-500 ring-1 ring-sky-500',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500',
    },
    {
      id: 'escalated',
      title: 'Escalated / Urgent',
      value: escalated,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      activeBorder: 'border-rose-500 ring-1 ring-rose-500',
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
            className={`text-left p-5 rounded-xl border bg-slate-900/60 backdrop-blur-sm transition-all duration-150 cursor-pointer hover:bg-slate-850 hover:translate-y-[-1px] ${
              isSelected ? card.activeBorder : card.border
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl md:text-3xl font-bold font-mono text-white">
                  {card.value}
                </span>
              )}

              {total > 0 && !isLoading && card.id !== 'all' && (
                <span className="text-xs text-slate-400 font-mono">
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
