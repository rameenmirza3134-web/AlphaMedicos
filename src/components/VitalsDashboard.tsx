import React from 'react';
import nasaHealthData from '../data/nasaHealthData.json';
import type { EvaluatedMetric, MetricStatus } from '../types/telemetry';
import { StatusIndicator } from './StatusIndicator';

interface VitalsDashboardProps {
  metrics: EvaluatedMetric[];
  astronautName: string;
  stationLocation: string;
  missionDay: number | null;
  overallStatus: MetricStatus;
  outOfStockCount: number;
  onOpenSurgeon: () => void;
  onOpenMedKit: () => void;
}

export const VitalsDashboard: React.FC<VitalsDashboardProps> = ({
  metrics,
  astronautName,
  stationLocation,
  missionDay,
  overallStatus,
  outOfStockCount,
  onOpenSurgeon,
  onOpenMedKit,
}) => {
  const barTone: Record<MetricStatus, string> = {
    Safe: 'bg-blue-600 dark:bg-sky-400',
    Warning: 'bg-amber-500 dark:bg-amber-400',
    Critical: 'bg-pink-600 dark:bg-pink-400',
    Pending: 'bg-slate-300 dark:bg-slate-700',
  };

  const cardBorderTone: Record<MetricStatus, string> = {
    Safe: 'border-blue-200/85 hover:border-blue-300 dark:border-blue-900/60 dark:hover:border-sky-700/80',
    Warning: 'border-amber-300 hover:border-amber-400 dark:border-amber-500/40 dark:hover:border-amber-500/60',
    Critical: 'border-pink-400 hover:border-pink-500 dark:border-pink-500/50 dark:hover:border-pink-400/70',
    Pending: 'border-blue-100 hover:border-blue-200 dark:border-slate-800 dark:hover:border-slate-700',
  };

  const enteredCount = metrics.filter((m) => m.status !== 'Pending').length;
  const alertCount = metrics.filter(
    (m) => m.status === 'Warning' || m.status === 'Critical'
  ).length;

  return (
    <section aria-labelledby="vitals-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 id="vitals-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Your Live Health &amp; Safety Checks
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {nasaHealthData.standard}
          </p>
        </div>
        {(astronautName.trim() || stationLocation.trim()) && (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            {astronautName.trim() && <span>{astronautName.trim()}</span>}
            {astronautName.trim() && stationLocation.trim() && <span aria-hidden="true">·</span>}
            {stationLocation.trim() && <span>{stationLocation.trim()}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className={`flex flex-col justify-between rounded-xl border bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 transition-colors ${cardBorderTone[metric.status]}`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {metric.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {metric.hrpCode}
                  </p>
                </div>
                <StatusIndicator status={metric.status} />
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-semibold tracking-tight text-slate-950 dark:text-white tabular-nums">
                  {metric.formattedValue}
                </span>
                <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
                  {metric.unit}
                </span>
              </div>

              {/* Threshold gauge */}
              <div className="mt-4">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${barTone[metric.status]}`}
                    style={{ width: `${metric.normalizedPosition}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {metric.thresholdSummary}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-blue-100 dark:border-slate-800 pt-3">
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-blue-700 dark:text-sky-300">What to do: </span>
                {metric.countermeasure}
              </p>
            </div>
          </article>
        ))}

        {/* 6th Card: Live Daily Summary */}
        <article className="flex flex-col justify-between rounded-xl border border-pink-200/85 bg-gradient-to-br from-white via-pink-50/40 to-blue-50/50 dark:border-pink-900/50 dark:from-[#0F172A] dark:via-[#141428] dark:to-[#0F1A2E] p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Overall Health Summary
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  From Your Runtime Data
                </p>
              </div>
              <StatusIndicator status={overallStatus} />
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-slate-950 dark:text-white tabular-nums">
                {missionDay !== null ? `Day ${missionDay}` : 'No Day Set'}
              </span>
              {missionDay !== null && (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  of 180
                </span>
              )}
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span>Readings Entered</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {enteredCount} of {metrics.length}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span>Checks Needing Care</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {alertCount} of {metrics.length}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span>Empty Medicine Items</span>
                <span
                  className={
                    outOfStockCount > 0
                      ? 'font-semibold text-pink-600 dark:text-pink-300'
                      : 'font-semibold text-blue-700 dark:text-sky-300'
                  }
                >
                  {outOfStockCount} empty
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-pink-100 dark:border-slate-800 pt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSurgeon}
              className="flex-1 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              Ask AI Doctor
            </button>
            <button
              type="button"
              onClick={onOpenMedKit}
              className="rounded-lg border border-pink-300 bg-white px-3 py-2 text-xs font-medium text-pink-700 hover:bg-pink-50 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              Medicine Kit
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};
