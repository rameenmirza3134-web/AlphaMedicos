import nasaHealthData from '../data/nasaHealthData.json';
import {
  CareNudge,
  EvaluatedMetric,
  HealthStatus,
  MedicalKitItem,
  MetricStatus,
  PredictiveDayPoint,
  RuntimeVitalsInput,
  VitalSnapshot,
} from '../types/telemetry';
export { findKitMatchForQuery, getMedicineCareGuide } from './medicineGuide';

export const EMPTY_RUNTIME_INPUT: RuntimeVitalsInput = {
  astronautName: '',
  stationLocation: '',
  missionDay: null,
  heartRate: null,
  radiation: null,
  sleepDuration: null,
  hydration: null,
  boneDensityLoss: null,
};

export function extractVitalSnapshot(input: RuntimeVitalsInput): VitalSnapshot {
  return {
    heartRate: input.heartRate,
    radiation: input.radiation,
    sleepDuration: input.sleepDuration,
    hydration: input.hydration,
    boneDensityLoss: input.boneDensityLoss,
  };
}

export function evaluateMetrics(vitals: VitalSnapshot): EvaluatedMetric[] {
  const { metrics } = nasaHealthData;

  let hrStatus: MetricStatus = 'Pending';
  if (vitals.heartRate !== null && Number.isFinite(vitals.heartRate)) {
    if (vitals.heartRate > 115) hrStatus = 'Critical';
    else if (vitals.heartRate >= 91 || vitals.heartRate < 60) hrStatus = 'Warning';
    else hrStatus = 'Safe';
  }

  let radStatus: MetricStatus = 'Pending';
  if (vitals.radiation !== null && Number.isFinite(vitals.radiation)) {
    if (vitals.radiation > 400) radStatus = 'Critical';
    else if (vitals.radiation >= 150) radStatus = 'Warning';
    else radStatus = 'Safe';
  }

  let sleepStatus: MetricStatus = 'Pending';
  if (vitals.sleepDuration !== null && Number.isFinite(vitals.sleepDuration)) {
    if (vitals.sleepDuration < 6.0) sleepStatus = 'Critical';
    else if (vitals.sleepDuration < 7.5) sleepStatus = 'Warning';
    else sleepStatus = 'Safe';
  }

  let hydStatus: MetricStatus = 'Pending';
  if (vitals.hydration !== null && Number.isFinite(vitals.hydration)) {
    if (vitals.hydration < 70) hydStatus = 'Critical';
    else if (vitals.hydration < 85) hydStatus = 'Warning';
    else hydStatus = 'Safe';
  }

  let boneStatus: MetricStatus = 'Pending';
  if (vitals.boneDensityLoss !== null && Number.isFinite(vitals.boneDensityLoss)) {
    if (vitals.boneDensityLoss < -1.2) boneStatus = 'Critical';
    else if (vitals.boneDensityLoss <= -0.5) boneStatus = 'Warning';
    else boneStatus = 'Safe';
  }

  return [
    {
      id: 'heartRate',
      label: metrics.heartRate.label,
      hrpCode: metrics.heartRate.hrpCode,
      value: vitals.heartRate,
      unit: metrics.heartRate.unit,
      formattedValue: vitals.heartRate !== null ? `${Math.round(vitals.heartRate)}` : '—',
      status: hrStatus,
      thresholdSummary: 'Safe 60–90 · Warning 91–115 · Critical > 115 BPM',
      countermeasure:
        hrStatus === 'Pending'
          ? 'Enter your current Heart Rate (BPM) to run the safety check.'
          : metrics.heartRate.countermeasures[hrStatus as HealthStatus],
      normalizedPosition:
        vitals.heartRate !== null
          ? Math.max(5, Math.min(98, ((vitals.heartRate - 45) / (140 - 45)) * 100))
          : 0,
    },
    {
      id: 'radiation',
      label: metrics.radiation.label,
      hrpCode: metrics.radiation.hrpCode,
      value: vitals.radiation,
      unit: metrics.radiation.unit,
      formattedValue: vitals.radiation !== null ? vitals.radiation.toFixed(1) : '—',
      status: radStatus,
      thresholdSummary: 'Safe < 150 · Warning 150–400 · Critical > 400 mSv',
      countermeasure:
        radStatus === 'Pending'
          ? 'Enter your radiation badge reading (mSv) to check exposure safety.'
          : metrics.radiation.countermeasures[radStatus as HealthStatus],
      normalizedPosition:
        vitals.radiation !== null
          ? Math.max(4, Math.min(98, (vitals.radiation / 500) * 100))
          : 0,
    },
    {
      id: 'sleepDuration',
      label: metrics.sleepDuration.label,
      hrpCode: metrics.sleepDuration.hrpCode,
      value: vitals.sleepDuration,
      unit: metrics.sleepDuration.unit,
      formattedValue: vitals.sleepDuration !== null ? vitals.sleepDuration.toFixed(1) : '—',
      status: sleepStatus,
      thresholdSummary: 'Safe >= 7.5 · Warning 6.0–7.4 · Critical < 6.0 hrs',
      countermeasure:
        sleepStatus === 'Pending'
          ? 'Enter how many hours you slept in the last 24 hours.'
          : metrics.sleepDuration.countermeasures[sleepStatus as HealthStatus],
      normalizedPosition:
        vitals.sleepDuration !== null
          ? Math.max(4, Math.min(98, ((9.0 - vitals.sleepDuration) / (9.0 - 3.5)) * 100))
          : 0,
    },
    {
      id: 'hydration',
      label: metrics.hydration.label,
      hrpCode: metrics.hydration.hrpCode,
      value: vitals.hydration,
      unit: metrics.hydration.unit,
      formattedValue: vitals.hydration !== null ? `${Math.round(vitals.hydration)}` : '—',
      status: hydStatus,
      thresholdSummary: 'Safe >= 85 · Warning 70–84 · Critical < 70 %',
      countermeasure:
        hydStatus === 'Pending'
          ? 'Enter your body water percentage (%) to check hydration.'
          : metrics.hydration.countermeasures[hydStatus as HealthStatus],
      normalizedPosition:
        vitals.hydration !== null
          ? Math.max(4, Math.min(98, ((100 - vitals.hydration) / (100 - 55)) * 100))
          : 0,
    },
    {
      id: 'boneDensityLoss',
      label: metrics.boneDensityLoss.label,
      hrpCode: metrics.boneDensityLoss.hrpCode,
      value: vitals.boneDensityLoss,
      unit: metrics.boneDensityLoss.unit,
      formattedValue: vitals.boneDensityLoss !== null ? vitals.boneDensityLoss.toFixed(2) : '—',
      status: boneStatus,
      thresholdSummary: 'Safe > -0.5 · Warning -0.5 to -1.2 · Critical < -1.2 %/mo',
      countermeasure:
        boneStatus === 'Pending'
          ? 'Enter your monthly bone strength change (%/mo, e.g. -0.4).'
          : metrics.boneDensityLoss.countermeasures[boneStatus as HealthStatus],
      normalizedPosition:
        vitals.boneDensityLoss !== null
          ? Math.max(4, Math.min(98, (Math.abs(vitals.boneDensityLoss) / 1.6) * 100))
          : 0,
    },
  ];
}

export function getOverallMissionStatus(evaluated: EvaluatedMetric[]): MetricStatus {
  if (evaluated.every((m) => m.status === 'Pending')) return 'Pending';
  if (evaluated.some((m) => m.status === 'Critical')) return 'Critical';
  if (evaluated.some((m) => m.status === 'Warning')) return 'Warning';
  return 'Safe';
}

export function computePredictiveTrend(
  vitals: VitalSnapshot,
  missionDay: number | null
): PredictiveDayPoint[] {
  const hasAnyReading =
    vitals.heartRate !== null ||
    vitals.radiation !== null ||
    vitals.sleepDuration !== null ||
    vitals.hydration !== null ||
    vitals.boneDensityLoss !== null;

  if (!hasAnyReading) {
    return [];
  }

  const hrStress = vitals.heartRate !== null ? Math.max(0, (vitals.heartRate - 75) * 1.15) : 0;
  const radStress = vitals.radiation !== null ? Math.max(0, (vitals.radiation - 100) * 0.14) : 0;
  const sleepStress =
    vitals.sleepDuration !== null ? Math.max(0, (7.5 - vitals.sleepDuration) * 11.5) : 0;
  const hydStress = vitals.hydration !== null ? Math.max(0, (86 - vitals.hydration) * 1.45) : 0;
  const boneStress =
    vitals.boneDensityLoss !== null
      ? Math.max(0, (Math.abs(vitals.boneDensityLoss) - 0.4) * 22)
      : 0;

  const currentRisk = Math.min(
    96,
    Math.max(8, hrStress + radStress + sleepStress + hydStress + boneStress)
  );

  const dailyDrift =
    (vitals.sleepDuration !== null && vitals.sleepDuration < 7.0 ? 2.4 : -0.4) +
    (vitals.hydration !== null && vitals.hydration < 83 ? 2.1 : -0.3) +
    (vitals.radiation !== null && vitals.radiation >= 150 ? 2.6 : 0.2) +
    (missionDay !== null && missionDay > 110 ? 0.7 : 0.1);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayOffset = idx + 1;
    const projectedRisk = Math.round(
      Math.max(8, Math.min(98, currentRisk + dailyDrift * dayOffset * 0.85))
    );
    const baselineRisk = Math.round(Math.max(10, 14 + dayOffset * 0.5));
    const projectedHeartRate =
      vitals.heartRate !== null
        ? Math.round(
            Math.max(
              52,
              Math.min(145, vitals.heartRate + (dailyDrift > 0 ? dayOffset * 1.1 : -dayOffset * 0.6))
            )
          )
        : null;
    const projectedHydration =
      vitals.hydration !== null
        ? Math.round(
            Math.max(
              50,
              Math.min(
                99,
                vitals.hydration - (vitals.hydration < 85 ? dayOffset * 0.8 : -dayOffset * 0.3)
              )
            )
          )
        : null;
    const projectedRadiation =
      vitals.radiation !== null
        ? Math.round(
            (vitals.radiation +
              dayOffset * 0.62 +
              (vitals.radiation >= 150 ? dayOffset * 3.5 : 0)) *
              10
          ) / 10
        : null;

    return {
      dayOffset,
      label: `Day +${dayOffset}`,
      projectedRiskScore: projectedRisk,
      baselineRiskScore: baselineRisk,
      projectedHeartRate,
      projectedHydration,
      projectedRadiation,
    };
  });
}

export function generateCareNudges(
  vitals: VitalSnapshot,
  evaluated: EvaluatedMetric[],
  medicalKit: MedicalKitItem[]
): CareNudge[] {
  const enteredCount = evaluated.filter((m) => m.status !== 'Pending').length;
  if (enteredCount === 0) {
    return [
      {
        id: 'nudge-awaiting-input',
        severity: 'Pending',
        title: 'Waiting for Your Live Readings',
        guidance:
          'Type your own Heart Rate, Space Radiation, Sleep, Water, and Bone Strength numbers on the left, and add your medicines in the Medicine Kit tab.',
        actionLabel: 'Open Medicine Kit',
        actionType: 'medical_kit',
      },
    ];
  }

  const nudges: CareNudge[] = [];
  const byId = Object.fromEntries(evaluated.map((m) => [m.id, m]));

  const hydrationItem = medicalKit.find((i) =>
    /water|hydrat|electrolyte|salt|rehydrat/.test(`${i.name} ${i.purpose}`.toLowerCase())
  );
  const sleepItem = medicalKit.find((i) =>
    /sleep|insomnia|melatonin|rest/.test(`${i.name} ${i.purpose}`.toLowerCase())
  );

  if (byId.radiation.status === 'Warning' || byId.radiation.status === 'Critical') {
    nudges.push({
      id: 'nudge-rad',
      severity: byId.radiation.status,
      title:
        byId.radiation.status === 'Critical'
          ? 'Move to the Protected Shelter Room Now'
          : 'Work Inside Safer Middle Station Rooms',
      guidance: byId.radiation.countermeasure,
      actionLabel: 'Ask AI Doctor',
      actionType: 'radiation_shelter',
    });
  }

  if (byId.hydration.status === 'Warning' || byId.hydration.status === 'Critical') {
    const hasHydItem = hydrationItem && hydrationItem.stock > 0;
    nudges.push({
      id: 'nudge-hyd',
      severity: byId.hydration.status,
      title: hasHydItem
        ? `Drink 300 ml Water + 1 ${hydrationItem.name} (${hydrationItem.stock} in kit)`
        : hydrationItem
        ? `Drink 300 ml Plain Water + Salty Broth (${hydrationItem.name} is at 0)`
        : 'Drink 300 ml Plain Water + Salty Broth (No Hydration Pack in Kit)',
      guidance:
        'In space, it is easy to forget to drink water. Slowly sipping water helps your heart and body stay strong.',
      actionLabel: 'Log +5% Water Drank',
      actionType: 'hydrate',
    });
  }

  if (byId.heartRate.status === 'Warning' || byId.heartRate.status === 'Critical') {
    nudges.push({
      id: 'nudge-hr',
      severity: byId.heartRate.status,
      title: 'Heart Rate Is High — Take a Breathing Break',
      guidance: `Your entered heart rate is ${vitals.heartRate} BPM. Open Relax & Games for slow breathing or the calm starlight game.`,
      actionLabel: 'Open Relax & Games',
      actionType: 'calm_mode',
    });
  }

  if (byId.sleepDuration.status === 'Warning' || byId.sleepDuration.status === 'Critical') {
    const hasSleepItem = sleepItem && sleepItem.stock > 0;
    nudges.push({
      id: 'nudge-sleep',
      severity: byId.sleepDuration.status,
      title: hasSleepItem
        ? `Dim Lights & Check ${sleepItem.name} (${sleepItem.stock} in kit)`
        : 'Dim Cabin Blue Lights Before Bedtime (Medicine-Free Sleep Tip)',
      guidance:
        'Too many sunrises in space make it hard to sleep. Switch to warm dim lights 90 minutes before going to bed.',
      actionLabel: 'Ask AI Doctor for Sleep Tips',
      actionType: 'sleep_hygiene',
    });
  }

  if (byId.boneDensityLoss.status === 'Warning' || byId.boneDensityLoss.status === 'Critical') {
    nudges.push({
      id: 'nudge-bone',
      severity: byId.boneDensityLoss.status,
      title: 'Do a 30-Minute Strength Workout Today',
      guidance: `Your bone strength change (${vitals.boneDensityLoss?.toFixed(2)}%/mo) shows you need extra squats on the space workout machine.`,
      actionLabel: 'Ask AI Doctor for Workout Tips',
      actionType: 'ared_exercise',
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      id: 'nudge-nominal',
      severity: 'Safe',
      title: 'Your Entered Health Checks Look Great',
      guidance:
        medicalKit.length > 0
          ? `All readings are safe and ${medicalKit.length} item(s) are tracked in your Medicine Kit.`
          : 'All readings are safe. Add your onboard supplies in the Medicine Kit tab so AlphaMedicos can track stock.',
      actionLabel: medicalKit.length > 0 ? 'Play Relaxing Starlight Game' : 'Add Medicines to Kit',
      actionType: medicalKit.length > 0 ? 'calm_mode' : 'medical_kit',
    });
  }

  return nudges.slice(0, 4);
}
