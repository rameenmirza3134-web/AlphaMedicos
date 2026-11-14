import React from 'react';
import { ClipboardEdit, RotateCcw } from 'lucide-react';
import type { RuntimeVitalsInput } from '../types/telemetry';

interface MissionSimulationPanelProps {
  input: RuntimeVitalsInput;
  onChange: (next: RuntimeVitalsInput) => void;
  onClearAll: () => void;
}

export const MissionSimulationPanel: React.FC<MissionSimulationPanelProps> = ({
  input,
  onChange,
  onClearAll,
}) => {
  const parseNullableNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  return (
    <aside
      aria-labelledby="runtime-input-heading"
      className="rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 space-y-5 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardEdit className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden="true" />
          <h2 id="runtime-input-heading" className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Enter Your Live Readings
          </h2>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Type your own real-time astronaut details and body numbers below. Everything updates automatically from what you enter.
      </p>

      {/* Astronaut Identity & Mission Info */}
      <div className="space-y-3 border-t border-blue-100 dark:border-slate-800 pt-4">
        <div className="space-y-1.5">
          <label htmlFor="input-astro-name" className="block text-xs font-medium text-slate-800 dark:text-slate-200">
            Your Name / Callsign
          </label>
          <input
            id="input-astro-name"
            type="text"
            value={input.astronautName}
            onChange={(e) => onChange({ ...input, astronautName: e.target.value })}
            placeholder="Type your name"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="input-station" className="block text-xs font-medium text-slate-800 dark:text-slate-200">
              Station / Room
            </label>
            <input
              id="input-station"
              type="text"
              value={input.stationLocation}
              onChange={(e) => onChange({ ...input, stationLocation: e.target.value })}
              placeholder="e.g. Lab 2"
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="input-mission-day" className="block text-xs font-medium text-slate-800 dark:text-slate-200">
              Trip Day (1–180)
            </label>
            <input
              id="input-mission-day"
              type="number"
              min={1}
              max={180}
              value={input.missionDay ?? ''}
              onChange={(e) =>
                onChange({ ...input, missionDay: parseNullableNumber(e.target.value) })
              }
              placeholder="1 - 180"
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />
          </div>
        </div>
      </div>

      {/* Live Runtime Vital Inputs */}
      <div className="space-y-4 border-t border-blue-100 dark:border-slate-800 pt-4">
        {/* Heart Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-hr" className="font-medium text-slate-800 dark:text-slate-200">
              Heart Rate (BPM)
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Safe: 60–90
            </span>
          </div>
          <input
            id="input-hr"
            type="number"
            min={30}
            max={220}
            value={input.heartRate ?? ''}
            onChange={(e) =>
              onChange({ ...input, heartRate: parseNullableNumber(e.target.value) })
            }
            placeholder="Enter BPM (e.g. 72)"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
          <input
            type="range"
            aria-label="Heart Rate Slider"
            min={45}
            max={150}
            step={1}
            value={input.heartRate ?? 45}
            onChange={(e) =>
              onChange({ ...input, heartRate: Number(e.target.value) })
            }
            className="telemetry-slider"
          />
        </div>

        {/* Space Radiation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-rad" className="font-medium text-slate-800 dark:text-slate-200">
              Space Radiation (mSv)
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Safe: &lt; 150
            </span>
          </div>
          <input
            id="input-rad"
            type="number"
            min={0}
            max={1000}
            step={0.5}
            value={input.radiation ?? ''}
            onChange={(e) =>
              onChange({ ...input, radiation: parseNullableNumber(e.target.value) })
            }
            placeholder="Enter mSv (e.g. 45)"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
          <input
            type="range"
            aria-label="Space Radiation Slider"
            min={0}
            max={500}
            step={5}
            value={input.radiation ?? 0}
            onChange={(e) =>
              onChange({ ...input, radiation: Number(e.target.value) })
            }
            className="telemetry-slider"
          />
        </div>

        {/* Daily Sleep */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-sleep" className="font-medium text-slate-800 dark:text-slate-200">
              Daily Sleep (hours)
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Safe: 7.5+
            </span>
          </div>
          <input
            id="input-sleep"
            type="number"
            min={0}
            max={16}
            step={0.1}
            value={input.sleepDuration ?? ''}
            onChange={(e) =>
              onChange({ ...input, sleepDuration: parseNullableNumber(e.target.value) })
            }
            placeholder="Enter hours (e.g. 7.8)"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
          <input
            type="range"
            aria-label="Daily Sleep Slider"
            min={3.0}
            max={10.0}
            step={0.1}
            value={input.sleepDuration ?? 3.0}
            onChange={(e) =>
              onChange({ ...input, sleepDuration: Number(e.target.value) })
            }
            className="telemetry-slider"
          />
        </div>

        {/* Hydration Level */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-hyd" className="font-medium text-slate-800 dark:text-slate-200">
              Body Water / Hydration (%)
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Safe: 85%+
            </span>
          </div>
          <input
            id="input-hyd"
            type="number"
            min={0}
            max={100}
            step={1}
            value={input.hydration ?? ''}
            onChange={(e) =>
              onChange({ ...input, hydration: parseNullableNumber(e.target.value) })
            }
            placeholder="Enter % (e.g. 90)"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
          <input
            type="range"
            aria-label="Hydration Slider"
            min={50}
            max={100}
            step={1}
            value={input.hydration ?? 50}
            onChange={(e) =>
              onChange({ ...input, hydration: Number(e.target.value) })
            }
            className="telemetry-slider"
          />
        </div>

        {/* Bone Strength */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-bone" className="font-medium text-slate-800 dark:text-slate-200">
              Bone Strength Change (%/mo)
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Safe: &gt; -0.5
            </span>
          </div>
          <input
            id="input-bone"
            type="number"
            min={-5}
            max={2}
            step={0.05}
            value={input.boneDensityLoss ?? ''}
            onChange={(e) =>
              onChange({ ...input, boneDensityLoss: parseNullableNumber(e.target.value) })
            }
            placeholder="Enter %/mo (e.g. -0.3)"
            className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
          />
          <input
            type="range"
            aria-label="Bone Strength Slider"
            min={-1.8}
            max={0}
            step={0.05}
            value={input.boneDensityLoss ?? 0}
            onChange={(e) =>
              onChange({ ...input, boneDensityLoss: Number(e.target.value) })
            }
            className="telemetry-slider"
          />
        </div>
      </div>
    </aside>
  );
};
