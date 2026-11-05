import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastProps {
  type?: ToastType;
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type = 'error', message, onClose }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderLeft: '3px solid #10B981',
          icon: CheckCircle,
          iconColor: '#10B981',
        };
      case 'info':
        return {
          borderLeft: '3px solid #0EA5E9',
          icon: Info,
          iconColor: '#0EA5E9',
        };
      default:
        return {
          borderLeft: '3px solid #EF4444',
          icon: AlertCircle,
          iconColor: '#EF4444',
        };
    }
  };

  const { icon: Icon, iconColor } = getStyles();

  return (
    <div
      role="alert"
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-md"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        borderLeftWidth: '3px',
        borderLeftColor: iconColor,
        color: 'var(--text-primary)',
      }}
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color: iconColor }} />
      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;
