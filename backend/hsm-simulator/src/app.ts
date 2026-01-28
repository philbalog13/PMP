import express from 'express';
import cors from 'cors';
import { hsmRoutes } from './routes/hsm.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HSM] ${req.method} ${req.path}`);
    next();
});

// Vulnerability Middleware
import { VulnEngine } from './services/VulnEngine';
app.use(VulnEngine.middleware);

// Routes
app.use('/hsm', hsmRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'HSM Simulator', version: '1.0.0' });
});

export default app;
