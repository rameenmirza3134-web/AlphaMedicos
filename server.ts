import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import type {
  EvaluatedMetric,
  MedicalKitItem,
  MetricStatus,
  VitalSnapshot,
} from './src/types/telemetry.js';
import {
  buildGroundControlReceipt,
  processFlightSurgeonRequest,
} from './src/utils/flightSurgeonService.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

app.post('/api/flight-surgeon', async (req, res) => {
  try {
    const { message, vitals, evaluatedMetrics, medicalKit, missionDay } = req.body as {
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

    res.json(result);
  } catch (err) {
    console.error('Flight Surgeon API error:', err);
    res.status(500).json({ error: 'Unable to process consultation request.' });
  }
});

app.post('/api/ground-control/sync', (req, res) => {
  const { missionDay, overallStatus } = req.body as {
    missionDay?: number | null;
    overallStatus?: MetricStatus;
  };
  res.json(buildGroundControlReceipt(missionDay, overallStatus));
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
