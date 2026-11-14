export type HealthStatus = 'Safe' | 'Warning' | 'Critical';
export type MetricStatus = HealthStatus | 'Pending';

export type MetricId =
  | 'heartRate'
  | 'radiation'
  | 'sleepDuration'
  | 'hydration'
  | 'boneDensityLoss';

export interface RuntimeVitalsInput {
  astronautName: string;
  stationLocation: string;
  missionDay: number | null; // 1 to 180
  heartRate: number | null; // BPM
  radiation: number | null; // mSv
  sleepDuration: number | null; // hrs
  hydration: number | null; // %
  boneDensityLoss: number | null; // %/mo
}

export interface VitalSnapshot {
  heartRate: number | null;
  radiation: number | null;
  sleepDuration: number | null;
  hydration: number | null;
  boneDensityLoss: number | null;
}

export interface EvaluatedMetric {
  id: MetricId;
  label: string;
  hrpCode: string;
  value: number | null;
  unit: string;
  formattedValue: string;
  status: MetricStatus;
  thresholdSummary: string;
  countermeasure: string;
  normalizedPosition: number; // 0 to 100 along threshold bar
}

export interface PredictiveDayPoint {
  dayOffset: number; // +1 to +7
  label: string;
  projectedRiskScore: number; // 0 to 100
  baselineRiskScore: number; // 0 to 100
  projectedHeartRate: number | null;
  projectedHydration: number | null;
  projectedRadiation: number | null;
}

export type QuickActionType =
  | 'calm_mode'
  | 'hydrate'
  | 'radiation_shelter'
  | 'ared_exercise'
  | 'sleep_hygiene'
  | 'medical_kit';

export interface CareNudge {
  id: string;
  severity: MetricStatus;
  title: string;
  guidance: string;
  actionLabel?: string;
  actionType?: QuickActionType;
}

export interface MedicalKitItem {
  id: string;
  name: string;
  purpose: string;
  unit: string;
  stock: number;
}

export interface FlightSurgeonResponse {
  assessment: string;
  urgency: HealthStatus;
  pharmacologicalOption: {
    medicationName: string;
    available: boolean;
    stockCount: number;
    guidance: string;
  };
  cabinProtocolSteps: string[];
  suggestedAction: QuickActionType | null;
  mode: 'gemini' | 'simulation';
}

export interface FlightSurgeonMessage {
  id: string;
  role: 'astronaut' | 'surgeon';
  timestamp: string;
  text: string;
  structured?: FlightSurgeonResponse;
}

export interface GroundControlReceipt {
  transmissionId: string;
  timestampUtc: string;
  downlinkBand: string;
  ackStatus: string;
  missionDay: number | null;
  overallStatus: MetricStatus;
}
