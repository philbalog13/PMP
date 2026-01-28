import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/acquirer.routes';
import { config } from './config';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(config.port, () => {
    console.log(`🏦 Sim-Acquirer-Service running on port ${config.port}`);
    console.log(`📋 Endpoints: POST /process, GET/POST /merchants`);
});

export default app;
