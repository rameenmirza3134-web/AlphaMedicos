import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CareNudge, PredictiveDayPoint, QuickActionType } from '../types/telemetry';
import { StatusIndicator } from './StatusIndicator';

interface PredictiveAnalyticsChartProps {
  trend: PredictiveDayPoint[];
  nudges: CareNudge[];
  onQuickAction: (action: QuickActionType) => void;
}

export const PredictiveAnalyticsChart: React.FC<PredictiveAnalyticsChartProps> = ({
  trend,
  nudges,
  onQuickAction,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number>(6);

  const width = 640;
  const height = 220;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const hasTrend = trend.length > 0;
  const safeHoveredIdx = Math.min(hoveredIdx, Math.max(0, trend.length - 1));

  const xForIdx = (idx: number) =>
    padLeft + (idx / Math.max(1, trend.length - 1)) * chartW;
  const yForRisk = (risk: number) =>
    padTop + ((100 - Math.max(0, Math.min(100, risk))) / 100) * chartH;

  const projectedPoints = hasTrend
    ? trend.map((pt, idx) => `${xForIdx(idx)},${yForRisk(pt.projectedRiskScore)}`).join(' ')
    : '';
  const baselinePoints = hasTrend
    ? trend.map((pt, idx) => `${xForIdx(idx)},${yForRisk(pt.baselineRiskScore)}`).join(' ')
    : '';

  const areaPath = hasTrend
    ? `M ${xForIdx(0)},${yForRisk(0)} ` +
      trend.map((pt, idx) => `L ${xForIdx(idx)},${yForRisk(pt.projectedRiskScore)}`).join(' ') +
      ` L ${xForIdx(trend.length - 1)},${yForRisk(0)} Z`
    : '';

  const peakRisk = hasTrend ? Math.max(...trend.map((p) => p.projectedRiskScore)) : 0;
  const strokeColor =
    peakRisk >= 65 ? '#EC4899' : peakRisk >= 30 ? '#F59E0B' : '#2563EB';
  const fillStopColor =
    peakRisk >= 65 ? '#EC4899' : peakRisk >= 30 ? '#F59E0B' : '#2563EB';

  const activePoint = hasTrend ? trend[safeHoveredIdx] ?? trend[trend.length - 1] : null;

  return (
    <section aria-labelledby="predictive-heading" className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* 7-Day Health Risk Forecast Chart */}
      <div className="xl:col-span-7 rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 flex flex-col justify-between transition-colors">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="predictive-heading" className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Next 7 Days Health Forecast
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Calculated live from the readings you enter
            </p>
          </div>
          {hasTrend && (
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-3.5"
                  style={{ backgroundColor: strokeColor }}
                />
                Your Forecast
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3.5 border-t border-dashed border-slate-400 dark:border-slate-500" />
                Healthy Normal
              </span>
            </div>
          )}
        </div>

        {!hasTrend ? (
          <div className="my-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-[#080C18]/70 p-8 text-center">
            <div className="max-w-sm space-y-1.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Readings Entered Yet
              </p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Enter your Heart Rate, Space Radiation, Sleep, Water, or Bone Strength on the left to draw your 7-day health forecast.
              </p>
            </div>
          </div>
        ) : (
          <>
            {activePoint && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-blue-100 bg-blue-50/70 dark:border-blue-900/60 dark:bg-[#080C18] px-3 py-2 font-mono text-xs tabular-nums">
                <span className="text-pink-600 dark:text-pink-400 font-semibold">{activePoint.label}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Risk: <strong className="text-slate-950 dark:text-white">{activePoint.projectedRiskScore}%</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Heart: <strong className="text-slate-900 dark:text-slate-200">{activePoint.projectedHeartRate !== null ? `${activePoint.projectedHeartRate} BPM` : '—'}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Water: <strong className="text-slate-900 dark:text-slate-200">{activePoint.projectedHydration !== null ? `${activePoint.projectedHydration}%` : '—'}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Rad: <strong className="text-slate-900 dark:text-slate-200">{activePoint.projectedRadiation !== null ? `${activePoint.projectedRadiation.toFixed(1)} mSv` : '—'}</strong>
                </span>
              </div>
            )}

            <div className="mt-3 w-full">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto cursor-crosshair select-none"
                role="img"
                aria-label="Next 7 Days Health Forecast Line Chart"
              >
                <defs>
                  <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fillStopColor} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={fillStopColor} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {[0, 30, 65, 100].map((val) => {
                  const y = yForRisk(val);
                  const isThreshold = val === 30 || val === 65;
                  return (
                    <g key={val}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={width - padRight}
                        y2={y}
                        stroke={
                          val === 65
                            ? 'rgba(236, 72, 153, 0.42)'
                            : val === 30
                            ? 'rgba(245, 158, 11, 0.38)'
                            : 'rgba(148, 163, 184, 0.25)'
                        }
                        strokeDasharray={isThreshold ? '4 4' : undefined}
                        strokeWidth={1}
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                <text
                  x={width - padRight}
                  y={yForRisk(65) - 5}
                  textAnchor="end"
                  className="fill-pink-600 dark:fill-pink-400 font-mono text-[9px]"
                >
                  High Risk (65%)
                </text>
                <text
                  x={width - padRight}
                  y={yForRisk(30) - 5}
                  textAnchor="end"
                  className="fill-amber-600 dark:fill-amber-400 font-mono text-[9px]"
                >
                  Be Careful (30%)
                </text>

                {areaPath && <path d={areaPath} fill="url(#riskAreaGrad)" />}

                <polyline
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  points={baselinePoints}
                />

                <polyline
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={projectedPoints}
                />

                {activePoint && (
                  <line
                    x1={xForIdx(safeHoveredIdx)}
                    y1={padTop}
                    x2={xForIdx(safeHoveredIdx)}
                    y2={height - padBottom}
                    stroke="rgba(236, 72, 153, 0.5)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {trend.map((pt, idx) => {
                  const cx = xForIdx(idx);
                  const cy = yForRisk(pt.projectedRiskScore);
                  const isSelected = idx === safeHoveredIdx;
                  return (
                    <g
                      key={pt.dayOffset}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onFocus={() => setHoveredIdx(idx)}
                      tabIndex={0}
                      className="outline-none"
                    >
                      <rect
                        x={cx - chartW / 14}
                        y={padTop}
                        width={chartW / 7}
                        height={chartH + padBottom}
                        fill="transparent"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5 : 3.5}
                        className={isSelected ? 'fill-white dark:fill-[#0F172A]' : ''}
                        fill={isSelected ? undefined : strokeColor}
                        stroke={strokeColor}
                        strokeWidth={2}
                      />
                      <text
                        x={cx}
                        y={height - 10}
                        textAnchor="middle"
                        className={`font-mono text-[10px] ${
                          isSelected
                            ? 'fill-pink-600 dark:fill-pink-400 font-semibold'
                            : 'fill-slate-500 dark:fill-slate-400'
                        }`}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Helpful Daily Reminders */}
      <div className="xl:col-span-5 rounded-xl border border-pink-200/85 bg-white/95 dark:border-pink-900/50 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 flex flex-col transition-colors">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Easy Daily Health Tips
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Simple steps you can take right now based on your numbers
          </p>
        </div>

        <div className="mt-4 space-y-3 flex-1">
          {nudges.map((nudge) => (
            <div
              key={nudge.id}
              className="rounded-lg border border-blue-100 bg-blue-50/45 dark:border-blue-900/50 dark:bg-[#080C18]/90 p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {nudge.title}
                </h3>
                <StatusIndicator status={nudge.severity} />
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {nudge.guidance}
              </p>
              {nudge.actionLabel && nudge.actionType && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onQuickAction(nudge.actionType!)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 transition-colors cursor-pointer"
                  >
                    <span>{nudge.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
