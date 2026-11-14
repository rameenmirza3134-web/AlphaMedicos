import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  EvaluatedMetric,
  FlightSurgeonResponse,
  GroundControlReceipt,
  HealthStatus,
  MedicalKitItem,
  MetricStatus,
  QuickActionType,
  VitalSnapshot,
} from '../types/telemetry';
import { findKitMatchForQuery, getMedicineCareGuide } from './medicineGuide';

const NASA_STANDARD_TITLE = 'NASA Astronaut Health Safety Guide';

export interface FlightSurgeonInput {
  message: string;
  vitals: VitalSnapshot;
  evaluatedMetrics: EvaluatedMetric[];
  medicalKit: MedicalKitItem[];
  missionDay: number | null;
}

export function resolveGeminiKey(): string | null {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return trimmed;
}

export function buildSimulationFlightSurgeonResponse(
  params: FlightSurgeonInput
): FlightSurgeonResponse {
  const lower = params.message.toLowerCase();
  const byId = Object.fromEntries(params.evaluatedMetrics.map((m) => [m.id, m]));

  const matchedItem = findKitMatchForQuery(params.message, params.medicalKit);

  const hasCriticalVital = params.evaluatedMetrics.some((m) => m.status === 'Critical');
  const hasWarningVital = params.evaluatedMetrics.some((m) => m.status === 'Warning');

  let urgency: HealthStatus = 'Safe';
  if (hasCriticalVital || /severe|chest|faint|vision|radiation|bleed/.test(lower)) {
    urgency = 'Critical';
  } else if (hasWarningVital || lower.length > 3) {
    urgency = 'Warning';
  }

  let suggestedAction: QuickActionType | null = 'calm_mode';
  if (byId.radiation?.status === 'Critical') suggestedAction = 'radiation_shelter';
  else if (byId.hydration?.status === 'Warning' || byId.hydration?.status === 'Critical')
    suggestedAction = 'hydrate';
  else if (byId.sleepDuration?.status === 'Warning' || byId.sleepDuration?.status === 'Critical')
    suggestedAction = 'calm_mode';
  else if (
    byId.boneDensityLoss?.status === 'Warning' ||
    byId.boneDensityLoss?.status === 'Critical'
  )
    suggestedAction = 'ared_exercise';

  const enteredParts: string[] = [];
  if (params.missionDay !== null) enteredParts.push(`Trip Day ${params.missionDay}`);
  if (params.vitals.heartRate !== null)
    enteredParts.push(`Heart Rate ${params.vitals.heartRate} BPM (${byId.heartRate?.status})`);
  if (params.vitals.hydration !== null)
    enteredParts.push(`Body Water ${params.vitals.hydration}% (${byId.hydration?.status})`);
  if (params.vitals.sleepDuration !== null)
    enteredParts.push(
      `Sleep ${params.vitals.sleepDuration.toFixed(1)} hrs (${byId.sleepDuration?.status})`
    );
  if (params.vitals.radiation !== null)
    enteredParts.push(
      `Radiation ${params.vitals.radiation.toFixed(1)} mSv (${byId.radiation?.status})`
    );

  const vitalSummary =
    enteredParts.length > 0
      ? `Your entered readings: ${enteredParts.join(', ')}.`
      : 'No live body readings entered yet.';

  const kitEmpty = params.medicalKit.length === 0;
  const stockCount = matchedItem?.stock ?? 0;
  const available = Boolean(matchedItem && matchedItem.stock > 0);
  const medName = matchedItem
    ? `${matchedItem.name} (${matchedItem.purpose})`
    : kitEmpty
    ? 'No Medicines in Kit'
    : 'No Matching Medicine in Kit';

  let assessment = '';
  let pharmaGuidance = '';
  const cabinProtocolSteps: string[] = [];

  if (matchedItem && matchedItem.stock > 0) {
    assessment = `I checked your note ("${params.message}") and your Medicine Kit. ${vitalSummary} You have ${matchedItem.stock} ${matchedItem.unit} of ${matchedItem.name} for "${matchedItem.purpose}" in stock.`;
    const guide = getMedicineCareGuide(matchedItem);
    pharmaGuidance = `Take 1 ${matchedItem.unit.replace(/s$/, '') || 'dose'} of ${matchedItem.name} as needed for ${matchedItem.purpose}, and update your kit count.`;
    cabinProtocolSteps.push(...guide.steps);
  } else if (matchedItem && matchedItem.stock === 0) {
    assessment = `Your ${matchedItem.name} (for "${matchedItem.purpose}") is at 0 stock right now! ${vitalSummary} Follow these easy medicine-free steps instead.`;
    const guide = getMedicineCareGuide(matchedItem);
    pharmaGuidance = `${matchedItem.name} is empty (0 ${matchedItem.unit} left). Use the medicine-free steps below.`;
    cabinProtocolSteps.push(...guide.steps);
  } else {
    assessment = kitEmpty
      ? `Your Medicine Kit currently has 0 items added. ${vitalSummary} Here is an easy medicine-free care guide for "${params.message}".`
      : `None of the medicines you added match "${params.message}". ${vitalSummary} Here is an easy medicine-free care guide.`;
    pharmaGuidance = kitEmpty
      ? 'No medicines added to your Medicine Kit yet. Following medicine-free cabin care.'
      : `Checked your kit (${params.medicalKit.map((i) => i.name).join(', ')}) — no matching item found, so follow these medicine-free steps.`;

    const fallbackGuide = getMedicineCareGuide({
      id: 'virtual',
      name: 'matching medicine',
      purpose: params.message,
      unit: 'doses',
      stock: 0,
    });
    cabinProtocolSteps.push(...fallbackGuide.steps);
  }

  if (byId.radiation?.status === 'Warning' || byId.radiation?.status === 'Critical') {
    cabinProtocolSteps.unshift(byId.radiation.countermeasure);
  }
  if (byId.hydration?.status === 'Warning' || byId.hydration?.status === 'Critical') {
    cabinProtocolSteps.push(
      'Slowly sip 300 ml of plain water over 15 minutes to boost your body water level.'
    );
  }
  if (byId.heartRate?.status === 'Warning' || byId.heartRate?.status === 'Critical') {
    cabinProtocolSteps.push(
      'Open Relax & Games and do 4 slow 4-4-4-4 breathing rounds or play the calm Starlight Drift game.'
    );
  }

  return {
    assessment,
    urgency,
    pharmacologicalOption: {
      medicationName: medName,
      available,
      stockCount,
      guidance: pharmaGuidance,
    },
    cabinProtocolSteps: cabinProtocolSteps.slice(0, 5),
    suggestedAction,
    mode: 'simulation',
  };
}

export async function processFlightSurgeonRequest(
  input: FlightSurgeonInput
): Promise<FlightSurgeonResponse> {
  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    return buildSimulationFlightSurgeonResponse(input);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are a friendly, caring NASA Space Doctor inside AlphaMedicos.
Always write in VERY SIMPLE, EASY, EVERYDAY ENGLISH (short clear sentences, no heavy medical jargon).

CRITICAL RULES:
1. Check ONLY the readings the astronaut actually entered (if a reading is null or "Not entered yet", do NOT invent or guess a number for it!). Compare entered numbers against NASA safety limits:
   - Space Radiation: Safe < 150 mSv, Warning 150-400 mSv, Critical > 400 mSv
   - Heart Rate: Safe 60-90 BPM, Warning 91-115 BPM, Critical > 115 BPM
   - Daily Sleep: Safe >= 7.5 hrs, Warning 6.0-7.4 hrs, Critical < 6.0 hrs
   - Bone Strength: Safe > -0.5 %/mo, Warning -0.5 to -1.2 %/mo, Critical < -1.2 %/mo
   - Body Water (Hydration): Safe >= 85%, Warning 70-84%, Critical < 70%
2. ALWAYS base your medicine guidance STRICTLY on the astronaut's custom Medicine Kit list provided in the prompt (each item has name, purpose, stock, unit).
   - If the kit has a matching medicine for the symptom/purpose with stock > 0: recommend THAT exact medicine name, mention its purpose and remaining stock, and also add supportive cabin steps.
   - If the matching medicine has stock === 0, OR if the kit is empty, OR if no item in the kit matches the symptom: set pharmacologicalOption.available = false, explain clearly in pharmacologicalOption.guidance that it is out of stock or not in the kit, and fill cabinProtocolSteps with 4-5 easy, step-by-step MEDICINE-FREE cabin tips (like putting a cool damp cloth on the forehead, slow 4-4-4-4 breathing, sipping water slowly, dimming bright lights, or resting quietly).
3. Never invent medicines that are not in the astronaut's Medicine Kit list. Never output code or raw JSON inside any text string.`;

    const contextPrompt = JSON.stringify({
      missionDay: input.missionDay ?? 'Not entered yet',
      reportedSymptom: input.message,
      enteredVitals: {
        heartRate:
          input.vitals.heartRate !== null ? `${input.vitals.heartRate} BPM` : 'Not entered yet',
        radiation:
          input.vitals.radiation !== null ? `${input.vitals.radiation} mSv` : 'Not entered yet',
        sleepDuration:
          input.vitals.sleepDuration !== null
            ? `${input.vitals.sleepDuration} hrs`
            : 'Not entered yet',
        hydration:
          input.vitals.hydration !== null ? `${input.vitals.hydration}%` : 'Not entered yet',
        boneDensityLoss:
          input.vitals.boneDensityLoss !== null
            ? `${input.vitals.boneDensityLoss} %/mo`
            : 'Not entered yet',
      },
      nasaSafetyCheck: input.evaluatedMetrics.map((m) => ({
        metric: m.label,
        value: m.value !== null ? `${m.formattedValue} ${m.unit}` : 'Not entered yet',
        status: m.status,
      })),
      astronautCustomMedicineKit:
        input.medicalKit.length > 0
          ? input.medicalKit.map((item) => ({
              name: item.name,
              purpose: item.purpose,
              stock: item.stock,
              unit: item.unit,
            }))
          : 'EMPTY — astronaut has not added any medicines yet',
      nasaStandard: NASA_STANDARD_TITLE,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: contextPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessment: {
              type: Type.STRING,
              description: 'Short, warm, very easy-to-understand summary of what is going on.',
            },
            urgency: {
              type: Type.STRING,
              description: 'One of: Safe, Warning, Critical',
            },
            pharmacologicalOption: {
              type: Type.OBJECT,
              properties: {
                medicationName: { type: Type.STRING },
                available: { type: Type.BOOLEAN },
                stockCount: { type: Type.INTEGER },
                guidance: { type: Type.STRING },
              },
              required: ['medicationName', 'available', 'stockCount', 'guidance'],
            },
            cabinProtocolSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 simple, easy-to-follow cabin care steps.',
            },
            suggestedAction: {
              type: Type.STRING,
              description:
                'One of calm_mode, hydrate, radiation_shelter, ared_exercise, sleep_hygiene, medical_kit, or empty string.',
            },
          },
          required: [
            'assessment',
            'urgency',
            'pharmacologicalOption',
            'cabinProtocolSteps',
            'suggestedAction',
          ],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText) as Omit<FlightSurgeonResponse, 'mode'>;

    const validUrgency: HealthStatus =
      parsed.urgency === 'Critical' || parsed.urgency === 'Warning' || parsed.urgency === 'Safe'
        ? parsed.urgency
        : 'Warning';

    const validAction: QuickActionType | null = (
      [
        'calm_mode',
        'hydrate',
        'radiation_shelter',
        'ared_exercise',
        'sleep_hygiene',
        'medical_kit',
      ] as const
    ).includes(parsed.suggestedAction as QuickActionType)
      ? (parsed.suggestedAction as QuickActionType)
      : null;

    return {
      ...parsed,
      urgency: validUrgency,
      suggestedAction: validAction,
      mode: 'gemini',
    };
  } catch (err) {
    console.error('Flight Surgeon API error, switching to simple fallback:', err);
    return buildSimulationFlightSurgeonResponse(input);
  }
}

export function buildGroundControlReceipt(
  missionDay?: number | null,
  overallStatus?: MetricStatus
): GroundControlReceipt {
  const now = new Date();
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return {
    transmissionId: `ALPHAMED-${now.getUTCFullYear()}-${suffix}`,
    timestampUtc: now.toISOString(),
    downlinkBand: 'Space-to-Earth Secure Link',
    ackStatus: 'RECEIVED BY NASA GROUND CONTROL',
    missionDay: missionDay ?? null,
    overallStatus: overallStatus ?? 'Pending',
  };
}
