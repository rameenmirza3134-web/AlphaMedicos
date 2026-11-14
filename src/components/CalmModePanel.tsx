import React, { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, Wind } from 'lucide-react';

interface CalmModePanelProps {
  currentHeartRate: number | null;
  onApplyRecoveredHeartRate: (nextHeartRate: number) => void;
}

type RelaxModeTab = 'breathing' | 'game';
type BreathPhase = 'Breathe In' | 'Hold Breath' | 'Breathe Out' | 'Rest Empty';

const PHASE_DURATION = 4; // 4-4-4-4 Box Breathing
const PHASES: { name: BreathPhase; instruction: string }[] = [
  { name: 'Breathe In', instruction: 'Breathe in slowly through your nose for 4 seconds' },
  { name: 'Hold Breath', instruction: 'Hold your breath gently and relax your shoulders' },
  { name: 'Breathe Out', instruction: 'Breathe out smoothly through your mouth for 4 seconds' },
  { name: 'Rest Empty', instruction: 'Pause calmly before starting the next breath' },
];

interface FloatingOrb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: 'pink' | 'blue' | 'white';
  pulseOffset: number;
}

interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  hue: 'pink' | 'blue' | 'white';
}

const PENTATONIC_FREQS = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

export const CalmModePanel: React.FC<CalmModePanelProps> = ({
  currentHeartRate,
  onApplyRecoveredHeartRate,
}) => {
  const [relaxTab, setRelaxTab] = useState<RelaxModeTab>('breathing');

  // Breathing state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [appliedRecovery, setAppliedRecovery] = useState(false);

  // Mind-Relaxing Starlight Drift Game state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orbsCleared, setOrbsCleared] = useState(0);
  const [gameSeconds, setGameSeconds] = useState(0);
  const [gamePaused, setGamePaused] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (relaxTab !== 'game' || gamePaused) return;
    const timer = window.setInterval(() => {
      setGameSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [relaxTab, gamePaused]);

  const playGentleChime = (freqIndex: number) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(
        PENTATONIC_FREQS[freqIndex % PENTATONIC_FREQS.length],
        now
      );

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.45);
    } catch {
      // ignore audio restrictions
    }
  };

  // Starlight Drift Canvas Animation Loop
  const orbsRef = useRef<FloatingOrb[]>([]);
  const ripplesRef = useRef<RippleEffect[]>([]);
  const nextOrbIdRef = useRef(1);

  useEffect(() => {
    if (relaxTab !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const spawnOrb = (width: number, height: number): FloatingOrb => {
      const hues: ('pink' | 'blue' | 'white')[] = ['pink', 'blue', 'white'];
      return {
        id: nextOrbIdRef.current++,
        x: 50 + Math.random() * Math.max(100, width - 100),
        y: 50 + Math.random() * Math.max(100, height - 100),
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        radius: 20 + Math.random() * 14,
        hue: hues[Math.floor(Math.random() * hues.length)],
        pulseOffset: Math.random() * Math.PI * 2,
      };
    };

    if (orbsRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        orbsRef.current.push(spawnOrb(canvas.width, canvas.height));
      }
    }

    let animId = 0;
    let tick = 0;

    const render = () => {
      tick += 0.025;
      const isDark = document.documentElement.classList.contains('dark');
      const w = canvas.width;
      const h = canvas.height;

      // Soft sky / deep night background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      if (isDark) {
        bgGrad.addColorStop(0, '#090F22');
        bgGrad.addColorStop(0.5, '#0D142B');
        bgGrad.addColorStop(1, '#141029');
      } else {
        bgGrad.addColorStop(0, '#EFF6FF');
        bgGrad.addColorStop(0.5, '#FFFFFF');
        bgGrad.addColorStop(1, '#FDF2F8');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Update & draw gentle ripples
      ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0.02);
      for (const r of ripplesRef.current) {
        r.radius += 1.5;
        r.alpha *= 0.96;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        const strokeRgb =
          r.hue === 'pink'
            ? '236, 72, 153'
            : r.hue === 'blue'
            ? '37, 99, 235'
            : isDark
            ? '255, 255, 255'
            : '148, 163, 184';
        ctx.strokeStyle = `rgba(${strokeRgb}, ${r.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Ensure 8 calm orbs are always floating
      while (orbsRef.current.length < 8) {
        orbsRef.current.push(spawnOrb(w, h));
      }

      for (const orb of orbsRef.current) {
        if (!gamePaused) {
          orb.x += orb.vx;
          orb.y += orb.vy;
          if (orb.x - orb.radius < 16 || orb.x + orb.radius > w - 16) orb.vx *= -1;
          if (orb.y - orb.radius < 16 || orb.y + orb.radius > h - 16) orb.vy *= -1;
        }

        const r = orb.radius + Math.sin(tick + orb.pulseOffset) * 2.5;
        const grad = ctx.createRadialGradient(orb.x - r * 0.25, orb.y - r * 0.25, 2, orb.x, orb.y, r);

        if (orb.hue === 'pink') {
          grad.addColorStop(0, isDark ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.98)');
          grad.addColorStop(0.55, 'rgba(244, 114, 182, 0.78)');
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.15)');
        } else if (orb.hue === 'blue') {
          grad.addColorStop(0, isDark ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.98)');
          grad.addColorStop(0.55, 'rgba(96, 165, 250, 0.78)');
          grad.addColorStop(1, 'rgba(37, 99, 235, 0.15)');
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0.98)');
          grad.addColorStop(0.6, isDark ? 'rgba(226, 232, 240, 0.65)' : 'rgba(191, 219, 254, 0.75)');
          grad.addColorStop(1, 'rgba(244, 114, 182, 0.18)');
        }

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle =
          orb.hue === 'pink'
            ? 'rgba(236, 72, 153, 0.45)'
            : 'rgba(59, 130, 246, 0.45)';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }

      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animId);
  }, [relaxTab, gamePaused]);

  const handleCanvasTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gamePaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let hitIdx = -1;
    for (let i = orbsRef.current.length - 1; i >= 0; i--) {
      const orb = orbsRef.current[i];
      const dist = Math.hypot(x - orb.x, y - orb.y);
      if (dist <= orb.radius + 10) {
        hitIdx = i;
        break;
      }
    }

    if (hitIdx !== -1) {
      const hitOrb = orbsRef.current[hitIdx];
      ripplesRef.current.push({
        x: hitOrb.x,
        y: hitOrb.y,
        radius: hitOrb.radius,
        alpha: 0.85,
        hue: hitOrb.hue,
      });
      orbsRef.current.splice(hitIdx, 1);
      setOrbsCleared((prev) => {
        playGentleChime(prev);
        return prev + 1;
      });
    } else {
      ripplesRef.current.push({
        x,
        y,
        radius: 8,
        alpha: 0.45,
        hue: 'blue',
      });
    }
  };

  // Breathing calculations
  const totalCycleSeconds = PHASE_DURATION * 4;
  const cyclePos = elapsedSeconds % totalCycleSeconds;
  const phaseIndex = Math.floor(cyclePos / PHASE_DURATION);
  const phaseElapsed = cyclePos % PHASE_DURATION;
  const phaseRemaining = Math.max(1, Math.ceil(PHASE_DURATION - phaseElapsed));
  const completedCycles = Math.floor(elapsedSeconds / totalCycleSeconds);
  const currentPhase = PHASES[phaseIndex] ?? PHASES[0];

  let orbScale = 0.72;
  let orbOpacity = 0.65;
  if (phaseIndex === 0) {
    const t = phaseElapsed / PHASE_DURATION;
    orbScale = 0.72 + t * 0.46;
    orbOpacity = 0.65 + t * 0.32;
  } else if (phaseIndex === 1) {
    orbScale = 1.18;
    orbOpacity = 0.97;
  } else if (phaseIndex === 2) {
    const t = phaseElapsed / PHASE_DURATION;
    orbScale = 1.18 - t * 0.46;
    orbOpacity = 0.97 - t * 0.32;
  }

  // Heart rate calming feedback based on total calm seconds (breathing + relaxing game)
  const totalRelaxSeconds = elapsedSeconds + gameSeconds * 0.5;
  const baselineHr = currentHeartRate;
  const maxDrop = baselineHr !== null ? Math.max(0, Math.min(18, baselineHr - 64)) : 0;
  const simulatedDrop =
    baselineHr !== null ? Math.min(maxDrop, Math.round((totalRelaxSeconds / 40) * maxDrop)) : 0;
  const liveSessionHr = baselineHr !== null ? Math.max(58, baselineHr - simulatedDrop) : null;

  const handleResetAll = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setOrbsCleared(0);
    setGameSeconds(0);
    setAppliedRecovery(false);
  };

  const handleApply = () => {
    if (liveSessionHr !== null && simulatedDrop > 0) {
      onApplyRecoveredHeartRate(liveSessionHr);
      setAppliedRecovery(true);
    }
  };

  return (
    <section aria-labelledby="calm-heading" className="space-y-5">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="calm-heading" className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Relax &amp; Mind-Calming Games
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Choose slow breathing or play the Starlight Drift relaxing game to calm your mind.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-white p-1 dark:border-blue-900/60 dark:bg-[#0F172A]">
          <button
            type="button"
            onClick={() => setRelaxTab('breathing')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              relaxTab === 'breathing'
                ? 'bg-pink-600 text-white dark:bg-pink-500/25 dark:text-pink-200'
                : 'text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-sky-300'
            }`}
          >
            <Wind className="h-3.5 w-3.5" aria-hidden="true" />
            <span>4-4-4-4 Breathing</span>
          </button>
          <button
            type="button"
            onClick={() => setRelaxTab('game')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              relaxTab === 'game'
                ? 'bg-blue-600 text-white dark:bg-sky-500/25 dark:text-sky-200'
                : 'text-slate-600 hover:text-pink-700 dark:text-slate-300 dark:hover:text-pink-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Starlight Drift Game</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Main Interactive Stage */}
        {relaxTab === 'breathing' ? (
          <div className="lg:col-span-8 rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-6 sm:p-8 flex flex-col items-center justify-between min-h-[520px] transition-colors">
            <div className="w-full flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  4-4-4-4 Calm Breathing Circle
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Match your breath to the growing and shrinking orb
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-pink-600 dark:text-pink-300 tabular-nums">
                Rounds Done: {completedCycles}
              </span>
            </div>

            <div className="relative my-8 flex h-64 w-64 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-blue-200 dark:border-blue-900/60" />
              <div className="absolute inset-6 rounded-full border border-pink-300/70 dark:border-pink-500/30" />

              <div
                className="h-40 w-40 rounded-full bg-gradient-to-br from-pink-400/70 via-white/80 to-blue-400/70 dark:from-pink-500/60 dark:via-sky-400/35 dark:to-blue-600/60 border border-pink-400/70 dark:border-pink-300/50 shadow-[0_0_50px_rgba(236,72,153,0.28)] dark:shadow-[0_0_55px_rgba(244,114,182,0.3)] transition-transform duration-100 ease-linear"
                style={{
                  transform: `scale(${orbScale})`,
                  opacity: orbOpacity,
                }}
              />

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-4xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {isRunning ? `0${phaseRemaining}` : '4-4-4-4'}
                </span>
                <span className="mt-1.5 text-sm font-semibold text-blue-800 dark:text-sky-200">
                  {isRunning ? currentPhase.name : 'Ready'}
                </span>
              </div>
            </div>

            <div className="w-full max-w-md space-y-5 text-center">
              <p className="text-sm text-slate-700 dark:text-slate-300 min-h-[24px]">
                {isRunning
                  ? currentPhase.instruction
                  : 'Press Start Breathing and match your breath to the circle.'}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {PHASES.map((p, idx) => {
                  const active = isRunning && idx === phaseIndex;
                  return (
                    <div
                      key={p.name}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-pink-500 bg-pink-50 text-pink-700 dark:border-pink-400/60 dark:bg-pink-500/20 dark:text-pink-200'
                          : 'border-blue-100 bg-blue-50/40 text-slate-500 dark:border-slate-800 dark:bg-[#080C18] dark:text-slate-400'
                      }`}
                    >
                      {p.name}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRunning((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-pink-600 bg-pink-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-pink-700 dark:border-pink-400/50 dark:bg-pink-500/25 dark:text-pink-100 dark:hover:bg-pink-500/35 transition-colors cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      <span>{elapsedSeconds > 0 ? 'Keep Going' : 'Start Breathing'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Starlight Drift Mind-Relaxing Game */
          <div className="lg:col-span-8 rounded-xl border border-blue-200/85 bg-white/95 dark:border-blue-900/60 dark:bg-[#0F172A]/95 backdrop-blur-sm p-5 sm:p-6 flex flex-col justify-between min-h-[520px] transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Starlight Drift · Mind-Relaxing Game
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  No timers, no pressure. Gently tap the floating light orbs to hear calming chimes and watch ripples fade.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" aria-hidden="true" />
                      <span>Chimes On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setGamePaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50/70 px-3 py-1.5 text-xs font-medium text-pink-800 hover:bg-pink-100 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-200 cursor-pointer"
                >
                  {gamePaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-900/60">
              <canvas
                ref={canvasRef}
                width={720}
                height={380}
                onClick={handleCanvasTap}
                className="w-full h-[340px] sm:h-[380px] block cursor-pointer"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
              <span className="text-slate-600 dark:text-slate-300">
                Orbs Gently Cleared:{' '}
                <strong className="text-pink-600 dark:text-pink-300 text-sm">{orbsCleared}</strong>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Calm Play Time:{' '}
                <strong className="text-blue-700 dark:text-sky-300 text-sm">{gameSeconds}s</strong>
              </span>
            </div>
          </div>
        )}

        {/* Right Column: Live Heart-Rate Calming Feedback */}
        <aside className="lg:col-span-4 rounded-xl border border-pink-200/85 bg-white/95 dark:border-pink-900/50 dark:bg-[#0F172A]/95 backdrop-blur-sm p-6 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Calm Progress &amp; Heart Recovery
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Both slow breathing and playing the Starlight Drift game help your mind unwind and ease elevated heart rate.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-[#080C18] p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Estimated Heart Rate Now</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-semibold text-blue-700 dark:text-sky-300 tabular-nums">
                    {liveSessionHr !== null ? liveSessionHr : '—'}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">BPM</span>
                </div>
                {baselineHr === null && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Enter your Heart Rate on the Health Check tab to track live BPM recovery here.
                  </p>
                )}
              </div>

              <div className="border-t border-blue-100 dark:border-slate-800 pt-3 space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Starting Heart Rate</span>
                  <span className="text-slate-900 dark:text-slate-200">
                    {baselineHr !== null ? `${baselineHr} BPM` : 'Not entered'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Calm Reduction</span>
                  <span className={simulatedDrop > 0 ? 'font-semibold text-pink-600 dark:text-pink-300' : 'text-slate-500 dark:text-slate-400'}>
                    {baselineHr !== null ? `-${simulatedDrop} BPM` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Relax Time</span>
                  <span className="text-slate-900 dark:text-slate-200">
                    {Math.floor(elapsedSeconds) + gameSeconds}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-pink-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={handleApply}
              disabled={simulatedDrop === 0 || liveSessionHr === null}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                appliedRecovery
                  ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-200'
                  : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30'
              }`}
            >
              {appliedRecovery && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>
                {appliedRecovery
                  ? 'Updated Heart Rate Saved!'
                  : simulatedDrop > 0
                  ? `Update My Heart Rate to ${liveSessionHr} BPM`
                  : baselineHr === null
                  ? 'Enter Heart Rate First to Sync'
                  : 'Relax for 10s+ to Update Heart Rate'}
              </span>
            </button>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Take a few quiet minutes whenever space feels overwhelming.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};
