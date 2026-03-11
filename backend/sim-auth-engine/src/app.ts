import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import routes from './routes';

export const createApp = (): Application => {
    const app: Application = express();

    app.use(helmet());
    app.use(cors());
    app.use(compression());

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
        res.setHeader('X-Request-ID', (req as any).requestId);
        next();
    });

    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
        });
        next();
    });

    app.use('/', routes);

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
        });
    });

    app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Error:', err.message);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message },
        });
    });

    return app;
};

export default createApp;
