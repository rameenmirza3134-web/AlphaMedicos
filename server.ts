import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import nasaHealthData from './src/data/nasaHealthData.json';
import { findKitMatchForQuery, getMedicineCareGuide } from './src/utils/telemetryEngine';
import type {
  EvaluatedMetric,
  FlightSurgeonResponse,
  HealthStatus,
  MedicalKitItem,
  MetricStatus,
  QuickActionType,
  VitalSnapshot,
} from './src/types/telemetry';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

function resolveGeminiKey(): string | null {
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

function buildSimulationFlightSurgeonResponse(params: {
  message: string;
  vitals: VitalSnapshot;
  evaluatedMetrics: EvaluatedMetric[];
  medicalKit: MedicalKitItem[];
  missionDay: number | null;
}): FlightSurgeonResponse {
  const lower = params.message.toLowerCase();
  const byId = Object.fromEntries(params.evaluatedMetrics.map((m) => [m.id, m]));

  // Match against the astronaut's custom-added Medicine Kit
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
  else if (byId.boneDensityLoss?.status === 'Warning' || byId.boneDensityLoss?.status === 'Critical')
    suggestedAction = 'ared_exercise';

  const enteredParts: string[] = [];
  if (params.missionDay !== null) enteredParts.push(`Trip Day ${params.missionDay}`);
  if (params.vitals.heartRate !== null)
    enteredParts.push(`Heart Rate ${params.vitals.heartRate} BPM (${byId.heartRate?.status})`);
  if (params.vitals.hydration !== null)
    enteredParts.push(`Body Water ${params.vitals.hydration}% (${byId.hydration?.status})`);
  if (params.vitals.sleepDuration !== null)
    enteredParts.push(`Sleep ${params.vitals.sleepDuration.toFixed(1)} hrs (${byId.sleepDuration?.status})`);
  if (params.vitals.radiation !== null)
    enteredParts.push(`Radiation ${params.vitals.radiation.toFixed(1)} mSv (${byId.radiation?.status})`);

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

app.post('/api/flight-surgeon', async (req, res) => {
  try {
    const { message, vitals, evaluatedMetrics, medicalKit, missionDay } = req.body as {
      message: string;
      vitals: VitalSnapshot;
      evaluatedMetrics: EvaluatedMetric[];
      medicalKit: MedicalKitItem[];
      missionDay: number | null;
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Please enter how you feel.' });
      return;
    }

    const apiKey = resolveGeminiKey();
    if (!apiKey) {
      const simResponse = buildSimulationFlightSurgeonResponse({
        message,
        vitals,
        evaluatedMetrics,
        medicalKit,
        missionDay: missionDay ?? null,
      });
      res.json(simResponse);
      return;
    }

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
      missionDay: missionDay ?? 'Not entered yet',
      reportedSymptom: message,
      enteredVitals: {
        heartRate: vitals.heartRate !== null ? `${vitals.heartRate} BPM` : 'Not entered yet',
        radiation: vitals.radiation !== null ? `${vitals.radiation} mSv` : 'Not entered yet',
        sleepDuration: vitals.sleepDuration !== null ? `${vitals.sleepDuration} hrs` : 'Not entered yet',
        hydration: vitals.hydration !== null ? `${vitals.hydration}%` : 'Not entered yet',
        boneDensityLoss:
          vitals.boneDensityLoss !== null ? `${vitals.boneDensityLoss} %/mo` : 'Not entered yet',
      },
      nasaSafetyCheck: evaluatedMetrics.map((m) => ({
        metric: m.label,
        value: m.value !== null ? `${m.formattedValue} ${m.unit}` : 'Not entered yet',
        status: m.status,
      })),
      astronautCustomMedicineKit:
        medicalKit.length > 0
          ? medicalKit.map((item) => ({
              name: item.name,
              purpose: item.purpose,
              stock: item.stock,
              unit: item.unit,
            }))
          : 'EMPTY — astronaut has not added any medicines yet',
      nasaStandard: nasaHealthData.standard,
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
      ['calm_mode', 'hydrate', 'radiation_shelter', 'ared_exercise', 'sleep_hygiene', 'medical_kit'] as const
    ).includes(parsed.suggestedAction as QuickActionType)
      ? (parsed.suggestedAction as QuickActionType)
      : null;

    res.json({
      ...parsed,
      urgency: validUrgency,
      suggestedAction: validAction,
      mode: 'gemini',
    } satisfies FlightSurgeonResponse);
  } catch (err) {
    console.error('Flight Surgeon API error, switching to simple fallback:', err);
    const { message, vitals, evaluatedMetrics, medicalKit, missionDay } = req.body;
    const fallback = buildSimulationFlightSurgeonResponse({
      message: message || 'General checkup',
      vitals: vitals ?? {
        heartRate: null,
        radiation: null,
        sleepDuration: null,
        hydration: null,
        boneDensityLoss: null,
      },
      evaluatedMetrics: evaluatedMetrics ?? [],
      medicalKit: medicalKit ?? [],
      missionDay: missionDay ?? null,
    });
    res.json(fallback);
  }
});

app.post('/api/ground-control/sync', (req, res) => {
  const { missionDay, overallStatus } = req.body as {
    missionDay?: number | null;
    overallStatus?: MetricStatus;
  };
  const now = new Date();
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  res.json({
    transmissionId: `ALPHAMED-${now.getUTCFullYear()}-${suffix}`,
    timestampUtc: now.toISOString(),
    downlinkBand: 'Space-to-Earth Secure Link',
    ackStatus: 'RECEIVED BY NASA GROUND CONTROL',
    missionDay: missionDay ?? null,
    overallStatus: overallStatus ?? 'Pending',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlphaMedicos server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
