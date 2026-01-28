import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/key.routes';
import { config } from './config';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(config.port, () => {
    console.log(`🔑 Key-Management running on port ${config.port}`);
    console.log(`📋 Endpoints: POST/GET /keys, POST /keys/:id/rotate, DELETE /keys/:id`);
});

export default app;
