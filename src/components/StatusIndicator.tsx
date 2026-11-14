import React from 'react';
import type { MetricStatus } from '../types/telemetry';

interface StatusIndicatorProps {
  status: MetricStatus;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, className = '' }) => {
  const styles: Record<MetricStatus, { wrapper: string; glyph: string; label: string }> = {
    Safe: {
      wrapper:
        'text-blue-700 bg-blue-50 border-blue-200 dark:text-sky-300 dark:bg-sky-500/15 dark:border-sky-400/30',
      glyph: '●',
      label: 'Safe',
    },
    Warning: {
      wrapper:
        'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-400/30',
      glyph: '▲',
      label: 'Warning',
    },
    Critical: {
      wrapper:
        'text-pink-700 bg-pink-50 border-pink-300 dark:text-pink-300 dark:bg-pink-500/15 dark:border-pink-400/35',
      glyph: '✖',
      label: 'Critical',
    },
    Pending: {
      wrapper:
        'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700',
      glyph: '○',
      label: 'Waiting',
    },
  };

  const current = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide whitespace-nowrap shrink-0 ${current.wrapper} ${className}`}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {current.glyph}
      </span>
      <span>{current.label}</span>
    </span>
  );
};
