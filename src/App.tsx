import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Moon, Sun, X } from 'lucide-react';
import { CalmModePanel } from './components/CalmModePanel';
import { FlightSurgeonPanel } from './components/FlightSurgeonPanel';
import { MedicalKitPanel } from './components/MedicalKitPanel';
import { MissionSimulationPanel } from './components/MissionSimulationPanel';
import { PredictiveAnalyticsChart } from './components/PredictiveAnalyticsChart';
import { ActiveTab, TopBar } from './components/TopBar';
import { VitalsDashboard } from './components/VitalsDashboard';
import type {
  FlightSurgeonMessage,
  GroundControlReceipt,
  MedicalKitItem,
  QuickActionType,
  RuntimeVitalsInput,
} from './types/telemetry';
import {
  computePredictiveTrend,
  EMPTY_RUNTIME_INPUT,
  evaluateMetrics,
  extractVitalSnapshot,
  generateCareNudges,
  getOverallMissionStatus,
} from './utils/telemetryEngine';

type ThemeMode = 'light' | 'dark';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem('alphamedicos-theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
  const [runtimeInput, setRuntimeInput] = useState<RuntimeVitalsInput>(EMPTY_RUNTIME_INPUT);
  const [medicalKit, setMedicalKit] = useState<MedicalKitItem[]>([]);
  const [surgeonMessages, setSurgeonMessages] = useState<FlightSurgeonMessage[]>([]);
  const [prefillSurgeonPrompt, setPrefillSurgeonPrompt] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<GroundControlReceipt | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('alphamedicos-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const vitals = useMemo(() => extractVitalSnapshot(runtimeInput), [runtimeInput]);
  const evaluatedMetrics = useMemo(() => evaluateMetrics(vitals), [vitals]);
  const overallStatus = useMemo(
    () => getOverallMissionStatus(evaluatedMetrics),
    [evaluatedMetrics]
  );
  const predictiveTrend = useMemo(
    () => computePredictiveTrend(vitals, runtimeInput.missionDay),
    [vitals, runtimeInput.missionDay]
  );
  const careNudges = useMemo(
    () => generateCareNudges(vitals, evaluatedMetrics, medicalKit),
    [vitals, evaluatedMetrics, medicalKit]
  );

  const outOfStockCount = useMemo(
    () => medicalKit.filter((item) => item.stock === 0).length,
    [medicalKit]
  );

  const showToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => {
      setActionToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const handleRuntimeChange = (next: RuntimeVitalsInput) => {
    setRuntimeInput(next);
    setLastReceipt(null);
  };

  const handleClearAllInputs = () => {
    setRuntimeInput(EMPTY_RUNTIME_INPUT);
    setLastReceipt(null);
    showToast('All live readings cleared.');
  };

  const handleAddMedicine = (newItem: Omit<MedicalKitItem, 'id'>) => {
    const created: MedicalKitItem = {
      ...newItem,
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setMedicalKit((prev) => [created, ...prev]);
    showToast(`Added ${created.name} (${created.stock} ${created.unit}) for "${created.purpose}".`);
  };

  const handleRemoveMedicine = (id: string) => {
    setMedicalKit((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDecrementStock = (id: string) => {
    setMedicalKit((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock - 1) } : item
      )
    );
  };

  const handleIncrementStock = (id: string) => {
    setMedicalKit((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: item.stock + 1 } : item
      )
    );
  };

  const handleSetStock = (id: string, stock: number) => {
    setMedicalKit((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, stock) } : item
      )
    );
  };

  const handleQuickAction = (action: QuickActionType) => {
    if (action === 'calm_mode') {
      setActiveTab('calm');
    } else if (action === 'medical_kit') {
      setActiveTab('medkit');
    } else if (action === 'hydrate') {
      setRuntimeInput((prev) => ({
        ...prev,
        hydration: Math.min(100, (prev.hydration ?? 80) + 5),
      }));
      showToast('Water intake logged! Your body water went up by 5%.');
    } else if (action === 'radiation_shelter') {
      setPrefillSurgeonPrompt(
        'My radiation reading is high. What simple steps should I take to stay safe right now?'
      );
      setActiveTab('surgeon');
    } else if (action === 'ared_exercise') {
      setPrefillSurgeonPrompt(
        'My bone strength is dropping. What easy 30-minute workout should I do today?'
      );
      setActiveTab('surgeon');
    } else if (action === 'sleep_hygiene') {
      setPrefillSurgeonPrompt(
        'I am having trouble sleeping in space. What easy bedtime steps can help me rest?'
      );
      setActiveTab('surgeon');
    }
  };

  const handleApplyRecoveredHeartRate = (nextHeartRate: number) => {
    setRuntimeInput((prev) => ({
      ...prev,
      heartRate: nextHeartRate,
    }));
    showToast(`Updated your Heart Rate to ${nextHeartRate} BPM!`);
  };

  const handleTransmitGroundControl = async () => {
    if (isTransmitting) return;
    setIsTransmitting(true);
    try {
      const response = await fetch('/api/ground-control/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionDay: runtimeInput.missionDay,
          overallStatus,
          vitals,
        }),
      });
      if (!response.ok) throw new Error('Sync error');
      const receipt = (await response.json()) as GroundControlReceipt;
      setLastReceipt(receipt);
    } catch {
      setLastReceipt({
        transmissionId: `ALPHAMED-LOCAL-${runtimeInput.missionDay ?? 'LIVE'}`,
        timestampUtc: new Date().toISOString(),
        downlinkBand: 'Space-to-Earth Backup Link',
        ackStatus: 'SAVED FOR NEXT EARTH CONTACT',
        missionDay: runtimeInput.missionDay,
        overallStatus,
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-[#F8FAFF] text-slate-900 dark:bg-[#080C18] dark:text-slate-100 flex flex-col transition-colors duration-200"
    >
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTransmitTelemetry={handleTransmitGroundControl}
        isTransmitting={isTransmitting}
        lastReceipt={lastReceipt}
      />

      {/* Ground Control Confirmation Banner */}
      {lastReceipt && (
        <div className="border-b border-blue-200 bg-blue-50 dark:border-sky-500/30 dark:bg-sky-500/10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-blue-900 dark:text-sky-100">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-sky-300 shrink-0" aria-hidden="true" />
              <span className="font-semibold">{lastReceipt.ackStatus}</span>
              <span aria-hidden="true" className="text-blue-400">·</span>
              <span className="font-mono text-blue-700 dark:text-sky-300 tabular-nums">
                Report {lastReceipt.transmissionId}
              </span>
              <span aria-hidden="true" className="text-blue-400">·</span>
              <span className="text-slate-600 dark:text-slate-300">{lastReceipt.downlinkBand}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastReceipt(null)}
              aria-label="Close message"
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Friendly Action Toast */}
      {actionToast && (
        <div className="border-b border-pink-200 bg-pink-50 dark:border-pink-500/30 dark:bg-pink-500/10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8 text-xs text-pink-900 dark:text-pink-200">
            <span className="font-medium">{actionToast}</span>
            <button
              type="button"
              onClick={() => setActionToast(null)}
              aria-label="Close notification"
              className="text-pink-600 hover:text-pink-800 dark:text-pink-300 dark:hover:text-pink-100 cursor-pointer p-1"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8 space-y-5">
        {/* Workspace Toolbar: Runtime Astronaut Info + Light/Dark Theme Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200/80 bg-white/90 dark:border-blue-900/60 dark:bg-[#0F172A]/90 px-4 py-2.5 transition-colors">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {runtimeInput.astronautName.trim() || 'Astronaut Crew'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {runtimeInput.stationLocation.trim() || 'Enter your live readings to begin'}
            </span>
            {runtimeInput.missionDay !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-pink-600 dark:text-pink-300 font-semibold tabular-nums">
                  Day {runtimeInput.missionDay} of 180
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 p-1 dark:border-blue-900/60 dark:bg-[#080C18]">
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                theme === 'light'
                  ? 'bg-white text-pink-600 shadow-xs border border-pink-200'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Light Theme</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-[#162038] text-pink-300 border border-pink-500/40'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dark Theme</span>
            </button>
          </div>
        </div>

        {activeTab === 'telemetry' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="w-full lg:w-[340px] shrink-0">
              <MissionSimulationPanel
                input={runtimeInput}
                onChange={handleRuntimeChange}
                onClearAll={handleClearAllInputs}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-6">
              <VitalsDashboard
                metrics={evaluatedMetrics}
                astronautName={runtimeInput.astronautName}
                stationLocation={runtimeInput.stationLocation}
                missionDay={runtimeInput.missionDay}
                overallStatus={overallStatus}
                outOfStockCount={outOfStockCount}
                onOpenSurgeon={() => setActiveTab('surgeon')}
                onOpenMedKit={() => setActiveTab('medkit')}
              />

              <PredictiveAnalyticsChart
                trend={predictiveTrend}
                nudges={careNudges}
                onQuickAction={handleQuickAction}
              />
            </div>
          </div>
        )}

        {activeTab === 'surgeon' && (
          <FlightSurgeonPanel
            vitals={vitals}
            evaluatedMetrics={evaluatedMetrics}
            medicalKit={medicalKit}
            missionDay={runtimeInput.missionDay}
            messages={surgeonMessages}
            onAddMessages={(newMsgs) =>
              setSurgeonMessages((prev) => [...prev, ...newMsgs])
            }
            onQuickAction={handleQuickAction}
            prefillPrompt={prefillSurgeonPrompt}
            onClearPrefill={() => setPrefillSurgeonPrompt(null)}
          />
        )}

        {activeTab === 'medkit' && (
          <MedicalKitPanel
            items={medicalKit}
            onAddMedicine={handleAddMedicine}
            onRemoveMedicine={handleRemoveMedicine}
            onDecrement={handleDecrementStock}
            onIncrement={handleIncrementStock}
            onSetStock={handleSetStock}
            onConsultSurgeon={(prompt) => {
              setPrefillSurgeonPrompt(prompt);
              setActiveTab('surgeon');
            }}
          />
        )}

        {activeTab === 'calm' && (
          <CalmModePanel
            currentHeartRate={vitals.heartRate}
            onApplyRecoveredHeartRate={handleApplyRecoveredHeartRate}
          />
        )}
      </main>
    </div>
  );
}
