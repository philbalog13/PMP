import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/transaction.routes';
import { config } from './config';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(config.port, () => {
    console.log(`🏪 Sim-POS-Service running on port ${config.port}`);
    console.log(`📋 Endpoints: POST /transactions, GET /transactions/:id`);
});

export default app;
