import type {
  EvaluatedMetric,
  MedicalKitItem,
  VitalSnapshot,
} from '../src/types/telemetry.js';
import { processFlightSurgeonRequest } from '../src/utils/flightSurgeonService.js';

interface ServerlessReq {
  method?: string;
  body?: unknown;
}

interface ServerlessRes {
  status: (code: number) => ServerlessRes;
  json: (payload: unknown) => void;
  end: () => void;
}

export default async function handler(req: ServerlessReq, res: ServerlessRes) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});

    const { message, vitals, evaluatedMetrics, medicalKit, missionDay } = rawBody as {
      message?: string;
      vitals?: VitalSnapshot;
      evaluatedMetrics?: EvaluatedMetric[];
      medicalKit?: MedicalKitItem[];
      missionDay?: number | null;
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Please enter how you feel.' });
      return;
    }

    const result = await processFlightSurgeonRequest({
      message,
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

    res.status(200).json(result);
  } catch (err) {
    console.error('Vercel Flight Surgeon handler error:', err);
    res.status(500).json({ error: 'Unable to process consultation request.' });
  }
}
