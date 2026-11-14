import React, { useState } from 'react';
import { Minus, PackageCheck, Plus, PlusCircle, ShieldAlert, Trash2 } from 'lucide-react';
import type { MedicalKitItem } from '../types/telemetry';
import { getMedicineCareGuide } from '../utils/telemetryEngine';

interface MedicalKitPanelProps {
  items: MedicalKitItem[];
  onAddMedicine: (item: Omit<MedicalKitItem, 'id'>) => void;
  onRemoveMedicine: (id: string) => void;
  onDecrement: (id: string) => void;
  onIncrement: (id: string) => void;
  onSetStock: (id: string, stock: number) => void;
  onConsultSurgeon: (prompt: string) => void;
}

export const MedicalKitPanel: React.FC<MedicalKitPanelProps> = ({
  items,
  onAddMedicine,
  onRemoveMedicine,
  onDecrement,
  onIncrement,
  onSetStock,
  onConsultSurgeon,
}) => {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [stockInput, setStockInput] = useState('1');
  const [unit, setUnit] = useState('pills');

  const zeroStockItems = items.filter((i) => i.stock === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPurpose = purpose.trim();
    if (!trimmedName || !trimmedPurpose) return;

    const parsedStock = Math.max(0, Math.floor(Number(stockInput) || 0));
    onAddMedicine({
      name: trimmedName,
      purpose: trimmedPurpose,
      stock: parsedStock,
      unit: unit.trim() || 'units',
    });

    setName('');
    setPurpose('');
    setStockInput('1');
  };

  return (
    <section aria-labelledby="medkit-heading" className="space-y-6">
      <div>
        <h2 id="medkit-heading" className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Spacecraft Medicine Kit
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Add your own medicines, what each one is used for (purpose), and how many you have in stock. AlphaMedicos builds your care guide and AI Doctor advice directly from your kit.
        </p>
      </div>

      {/* Add Medicine Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 space-y-4 transition-colors"
      >
        <div className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Add Medicine to Your Kit
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="med-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Medicine Name
            </label>
            <input
              id="med-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ibuprofen, Bandages"
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="med-purpose" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Purpose (What it helps with)
            </label>
            <input
              id="med-purpose"
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Headache & pain, Nausea, Sleep"
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="med-stock" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Stock Count
            </label>
            <input
              id="med-stock"
              type="number"
              min={0}
              max={999}
              required
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:focus:border-pink-400"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="med-unit" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Unit
            </label>
            <input
              id="med-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="pills, packs"
              className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!name.trim() || !purpose.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-pink-600 bg-pink-600 px-5 py-2 text-xs font-medium text-white hover:bg-pink-700 dark:border-pink-400/50 dark:bg-pink-500/25 dark:text-pink-100 dark:hover:bg-pink-500/35 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add to Medicine Kit</span>
          </button>
        </div>
      </form>

      {zeroStockItems.length > 0 && (
        <div className="rounded-xl border border-pink-300 bg-pink-50/80 dark:border-pink-500/40 dark:bg-pink-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-pink-900 dark:text-pink-200">
                Medicine-Free Care Guide Active ({zeroStockItems.map((i) => i.name).join(', ')})
              </p>
              <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                Because these items are at 0 stock, both the Medicine Kit and AI Doctor automatically switch to medicine-free steps for their purpose.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onConsultSurgeon(
                `I need help for ${zeroStockItems[0].purpose}, and my ${zeroStockItems[0].name} is at 0 stock. What medicine-free steps should I follow?`
              )
            }
            className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30 transition-colors cursor-pointer whitespace-nowrap"
          >
            Ask AI Doctor Without Medicine
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-white/80 dark:border-blue-900/60 dark:bg-[#0F172A]/70 p-10 text-center space-y-2">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            Your Medicine Kit Is Empty
          </p>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Use the form above to add the medicines you have on board—along with their purpose and current stock. Your custom care guide will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isZero = item.stock === 0;
            const isLow = item.stock > 0 && item.stock <= 2;
            const guide = getMedicineCareGuide(item);

            return (
              <article
                key={item.id}
                className={`rounded-xl border bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 flex flex-col justify-between transition-colors ${
                  isZero
                    ? 'border-pink-400 dark:border-pink-500/55'
                    : isLow
                    ? 'border-amber-300 dark:border-amber-500/45'
                    : 'border-blue-200/85 dark:border-blue-900/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-blue-700 dark:text-sky-300 font-medium">
                        Purpose: {item.purpose}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                          isZero
                            ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-400/35 dark:bg-pink-500/15 dark:text-pink-300'
                            : isLow
                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300'
                        }`}
                      >
                        {isZero ? '✖ Empty (0 Left)' : isLow ? '▲ Running Low' : '● In Stock'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveMedicine(item.id)}
                        aria-label={`Remove ${item.name} from kit`}
                        title="Remove from kit"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/15 dark:hover:text-pink-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Runtime Stock Controls */}
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={item.stock}
                        onChange={(e) => {
                          const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          onSetStock(item.id, val);
                        }}
                        aria-label={`Stock count for ${item.name}`}
                        className={`h-11 w-20 rounded-lg border px-3 font-mono text-2xl font-semibold tabular-nums focus:outline-none ${
                          isZero
                            ? 'border-pink-300 bg-pink-50/40 text-pink-600 focus:border-pink-500 dark:border-pink-500/40 dark:bg-[#080C18] dark:text-pink-400'
                            : 'border-blue-200 bg-white text-slate-950 focus:border-pink-500 dark:border-slate-700 dark:bg-[#080C18] dark:text-white'
                        }`}
                      />
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {item.unit} left
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDecrement(item.id)}
                        disabled={item.stock <= 0}
                        aria-label={`Use 1 ${item.name}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onIncrement(item.id)}
                        aria-label={`Add 1 ${item.name}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Guide Based on This Medicine & Stock */}
                <div className="mt-5 border-t border-blue-100 dark:border-slate-800 pt-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <PackageCheck className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 shrink-0" aria-hidden="true" />
                      <span>{guide.title}</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {guide.steps.map((step, index) => (
                      <li key={index} className="leading-relaxed">
                        • {step}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onConsultSurgeon(
                          isZero
                            ? `I need help with ${item.purpose}, and my ${item.name} is at 0 stock.`
                            : `How should I safely take ${item.name} for ${item.purpose}? I have ${item.stock} ${item.unit} left.`
                        )
                      }
                      className="text-xs font-semibold text-blue-700 hover:text-pink-600 dark:text-sky-300 dark:hover:text-pink-300 transition-colors cursor-pointer"
                    >
                      Ask AI Doctor about {item.name} →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
