import type { MetricStatus } from '../../src/types/telemetry.js';
import { buildGroundControlReceipt } from '../../src/utils/flightSurgeonService.js';

interface ServerlessReq {
  method?: string;
  body?: unknown;
}

interface ServerlessRes {
  status: (code: number) => ServerlessRes;
  json: (payload: unknown) => void;
  end: () => void;
}

export default function handler(req: ServerlessReq, res: ServerlessRes) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawBody =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  const { missionDay, overallStatus } = rawBody as {
    missionDay?: number | null;
    overallStatus?: MetricStatus;
  };

  const receipt = buildGroundControlReceipt(missionDay, overallStatus);
  res.status(200).json(receipt);
}
