import React from 'react';
import { Check, Loader2, Radio } from 'lucide-react';
import type { GroundControlReceipt } from '../types/telemetry';

export type ActiveTab = 'telemetry' | 'surgeon' | 'medkit' | 'calm';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onTransmitTelemetry: () => void;
  isTransmitting: boolean;
  lastReceipt: GroundControlReceipt | null;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'telemetry', label: 'Health Check' },
  { id: 'surgeon', label: 'AI Doctor' },
  { id: 'medkit', label: 'Medicine Kit' },
  { id: 'calm', label: 'Relax & Games' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onTransmitTelemetry,
  isTransmitting,
  lastReceipt,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-200/80 bg-white/95 dark:border-blue-900/60 dark:bg-[#080C18]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element Brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('telemetry');
          }}
          className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-sm"
        >
          AlphaMedicos
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-sm cursor-pointer ${
                  active
                    ? 'text-pink-600 dark:text-pink-400'
                    : 'text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-sky-300'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-gradient-to-r from-blue-600 to-pink-500 dark:from-sky-400 dark:to-pink-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTransmitTelemetry}
            disabled={isTransmitting}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
              lastReceipt && !isTransmitting
                ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25'
                : 'border-pink-500 bg-pink-600 text-white hover:bg-pink-700 dark:border-pink-400/50 dark:bg-pink-500/20 dark:text-pink-100 dark:hover:bg-pink-500/30'
            } disabled:opacity-60`}
          >
            {isTransmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : lastReceipt ? (
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-sky-300" aria-hidden="true" />
            ) : (
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isTransmitting
                ? 'Sending to NASA...'
                : lastReceipt
                ? 'Sent to NASA Ground Control'
                : 'Send Update to NASA'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-around border-t border-blue-100 dark:border-blue-900/50 px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300'
                  : 'text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-sky-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
