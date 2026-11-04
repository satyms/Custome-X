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
          bg: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
          icon: CheckCircle,
          iconColor: 'text-emerald-400',
        };
      case 'info':
        return {
          bg: 'bg-sky-950/90 border-sky-500/30 text-sky-200',
          icon: Info,
          iconColor: 'text-sky-400',
        };
      default:
        return {
          bg: 'bg-rose-950/90 border-rose-500/30 text-rose-200',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
        };
    }
  };

  const { bg, icon: Icon, iconColor } = getStyles();

  return (
    <div
      role="alert"
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-3 duration-200 ${bg}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
      <span className="text-sm font-medium flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;
