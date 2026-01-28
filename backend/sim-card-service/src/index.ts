import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cardRoutes from './routes/card.routes';
import { config } from './config';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use(cardRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`💳 Sim-Card-Service running on port ${PORT}`);
    console.log(`📋 Endpoints: POST/GET /cards, GET /cards/:pan, PATCH /cards/:pan/status`);
});

export default app;
