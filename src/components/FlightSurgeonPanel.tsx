import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Send, ShieldAlert } from 'lucide-react';
import type {
  EvaluatedMetric,
  FlightSurgeonMessage,
  FlightSurgeonResponse,
  MedicalKitItem,
  QuickActionType,
  VitalSnapshot,
} from '../types/telemetry';
import { StatusIndicator } from './StatusIndicator';

interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface FlightSurgeonPanelProps {
  vitals: VitalSnapshot;
  evaluatedMetrics: EvaluatedMetric[];
  medicalKit: MedicalKitItem[];
  missionDay: number | null;
  messages: FlightSurgeonMessage[];
  onAddMessages: (newMsgs: FlightSurgeonMessage[]) => void;
  onQuickAction: (action: QuickActionType) => void;
  prefillPrompt?: string | null;
  onClearPrefill?: () => void;
}

export const FlightSurgeonPanel: React.FC<FlightSurgeonPanelProps> = ({
  vitals,
  evaluatedMetrics,
  medicalKit,
  missionDay,
  messages,
  onAddMessages,
  onQuickAction,
  prefillPrompt,
  onClearPrefill,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
      onClearPrefill?.();
    }
  }, [prefillPrompt, onClearPrefill]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const zeroStockItems = medicalKit.filter((i) => i.stock === 0);

  const submitSymptom = async (textToSubmit?: string) => {
    const query = (textToSubmit ?? input).trim();
    if (!query || isLoading) return;

    const astronautMsg: FlightSurgeonMessage = {
      id: `astro-${Date.now()}`,
      role: 'astronaut',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query,
    };

    if (!textToSubmit) setInput('');
    setIsLoading(true);
    setVoiceNotice(null);

    try {
      const response = await fetch('/api/flight-surgeon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          vitals,
          evaluatedMetrics,
          medicalKit,
          missionDay,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not reach AI Doctor');
      }

      const data = (await response.json()) as FlightSurgeonResponse;
      const surgeonMsg: FlightSurgeonMessage = {
        id: `surg-${Date.now() + 1}`,
        role: 'surgeon',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.assessment,
        structured: data,
      };

      onAddMessages([astronautMsg, surgeonMsg]);
    } catch {
      const errorMsg: FlightSurgeonMessage = {
        id: `err-${Date.now() + 1}`,
        role: 'surgeon',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: 'Could not connect right now. Sit calmly, drink a sip of water, and try asking again in a moment.',
      };
      onAddMessages([astronautMsg, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceMic = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNotice(
        'Voice typing is not supported in this browser. Please type how you feel below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript.trim());
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone permission was blocked. Allow mic access or type your message.');
        } else {
          setVoiceNotice('Voice stopped early. Try speaking again or type how you feel.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setVoiceNotice(null);
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Could not start the microphone.');
    }
  };

  const actionLabelMap: Record<QuickActionType, string> = {
    calm_mode: 'Open Relax & Games',
    hydrate: 'Log +5% Water Drank',
    radiation_shelter: 'Check Radiation Numbers',
    ared_exercise: 'Check Bone Health',
    sleep_hygiene: 'Check Sleep Numbers',
    medical_kit: 'Open Medicine Kit',
  };

  return (
    <section aria-labelledby="surgeon-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Info Column */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 space-y-4 transition-colors">
          <div>
            <h2 id="surgeon-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              AI Health Doctor
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Tell the AI Doctor how you feel by typing or speaking. Advice is tailored strictly to the medicines, purposes, and stock in your Medicine Kit.
            </p>
          </div>

          <div className="border-t border-blue-100 dark:border-slate-800 pt-3 space-y-2 text-xs font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Heart Rate</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {vitals.heartRate !== null ? `${vitals.heartRate} BPM` : 'Not entered'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Radiation</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {vitals.radiation !== null ? `${vitals.radiation.toFixed(1)} mSv` : 'Not entered'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Sleep</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {vitals.sleepDuration !== null ? `${vitals.sleepDuration.toFixed(1)} hrs` : 'Not entered'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Body Water</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {vitals.hydration !== null ? `${vitals.hydration}%` : 'Not entered'}
              </span>
            </div>
          </div>

          <div className="border-t border-blue-100 dark:border-slate-800 pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Your Medicine Kit</p>
              <button
                type="button"
                onClick={() => onQuickAction('medical_kit')}
                className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 dark:text-pink-400 cursor-pointer"
              >
                Edit Kit
              </button>
            </div>

            {medicalKit.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No medicines added yet. Add your medicines in the Medicine Kit tab, or ask the AI Doctor for medicine-free guidance.
              </p>
            ) : (
              <div className="space-y-2">
                {medicalKit.map((item) => (
                  <div key={item.id} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                      <span
                        className={`font-mono tabular-nums shrink-0 ${
                          item.stock === 0
                            ? 'text-pink-600 dark:text-pink-400 font-semibold'
                            : 'text-blue-700 dark:text-sky-300'
                        }`}
                      >
                        {item.stock === 0 ? '0 (Empty)' : `${item.stock} ${item.unit}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      For: {item.purpose}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {zeroStockItems.length > 0 && (
              <p className="pt-1 text-[11px] text-pink-700 dark:text-pink-300 leading-relaxed">
                Empty items automatically trigger medicine-free care steps.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Chat & Advice Stream */}
      <div className="lg:col-span-8 flex flex-col rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm overflow-hidden min-h-[560px] transition-colors">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[620px]">
          {messages.length === 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 dark:border-blue-900/50 dark:bg-[#080C18] p-5 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Health Doctor Is Ready
              </p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Type your symptoms below or press the Voice Mic button to speak hands-free. The AI Doctor will check your custom Medicine Kit by medicine name, purpose, and stock count.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === 'astronaut') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[82%] rounded-xl border border-pink-300 bg-pink-50 dark:border-pink-500/35 dark:bg-pink-500/15 px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-4 text-[11px] text-pink-700 dark:text-pink-300 font-mono">
                      <span>You</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            }

            const s = msg.structured;
            return (
              <div key={msg.id} className="rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-[#080C18] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-blue-700 dark:text-sky-300">AI Doctor Advice</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {s?.mode === 'gemini' ? 'Gemini AI' : 'Space Health Guide'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </div>
                  {s && <StatusIndicator status={s.urgency} />}
                </div>

                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{msg.text}</p>

                {s && (
                  <>
                    {/* Medicine Check */}
                    <div
                      className={`rounded-lg border p-3.5 space-y-1.5 ${
                        s.pharmacologicalOption.available
                          ? 'border-blue-200 bg-white dark:border-sky-500/30 dark:bg-sky-500/10'
                          : 'border-pink-300 bg-pink-50/80 dark:border-pink-500/35 dark:bg-pink-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {!s.pharmacologicalOption.available && (
                            <ShieldAlert className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden="true" />
                          )}
                          <span>
                            Medicine Kit Check: {s.pharmacologicalOption.medicationName}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs tabular-nums font-semibold ${
                            s.pharmacologicalOption.available
                              ? 'text-blue-700 dark:text-sky-300'
                              : 'text-pink-700 dark:text-pink-300'
                          }`}
                        >
                          {s.pharmacologicalOption.available
                            ? `${s.pharmacologicalOption.stockCount} left`
                            : '0 available (Medicine-Free Guide)'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {s.pharmacologicalOption.guidance}
                      </p>
                    </div>

                    {/* Step-by-Step Easy Tips */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                        {s.pharmacologicalOption.available
                          ? 'Easy Guide Using Your Kit'
                          : 'Medicine-Free Steps to Feel Better'}
                      </p>
                      <ol className="space-y-2">
                        {s.cabinProtocolSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-pink-600 dark:text-pink-400 font-semibold shrink-0">
                              {idx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {s.suggestedAction && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => onQuickAction(s.suggestedAction!)}
                          className="rounded-lg border border-blue-600 bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30 transition-colors cursor-pointer"
                        >
                          {actionLabelMap[s.suggestedAction]}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-pink-600 dark:text-pink-300 font-mono">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Checking your readings and Medicine Kit...</span>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {/* Input & Voice Mic Bar */}
        <div className="border-t border-blue-100 bg-blue-50/40 dark:border-slate-800 dark:bg-[#080C18] p-4 space-y-2.5">
          {voiceNotice && (
            <p className="text-xs text-pink-700 dark:text-pink-300">{voiceNotice}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSymptom();
            }}
            className="flex items-center gap-2.5"
          >
            <button
              type="button"
              onClick={toggleVoiceMic}
              aria-label={isListening ? 'Stop voice typing' : 'Speak how you feel'}
              title={isListening ? 'Stop listening' : 'Voice Mic'}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
                isListening
                  ? 'border-pink-500 bg-pink-600 text-white dark:border-pink-400 dark:bg-pink-500/30 dark:text-pink-100'
                  : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-pink-500/50'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Voice Mic</span>
                </>
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell the AI Doctor how you feel..."
              className="h-11 flex-1 rounded-lg border border-blue-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-pink-600 bg-pink-600 px-4 text-xs font-medium text-white hover:bg-pink-700 dark:border-pink-400/50 dark:bg-pink-500/25 dark:text-pink-100 dark:hover:bg-pink-500/35 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
