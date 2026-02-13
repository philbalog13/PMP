import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { hsmRoutes } from './routes/hsm.routes';
import { VulnEngine } from './services/VulnEngine';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HSM] ${req.method} ${req.path}`);
    next();
});

app.use(VulnEngine.middleware);
app.use('/hsm', hsmRoutes);

app.get(['/health', '/hsm/health'], (_req: Request, res: Response) => {
    res.json({ status: 'OK', service: 'HSM Simulator', version: '1.1.0' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[HSM] Request pipeline error:', err.message);
    res.status(500).json({ success: false, error: 'Unhandled request error', code: 'PIPELINE_ERROR' });
});

export default app;
