import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/crypto.routes';
import { config } from './config';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(config.port, () => {
    console.log(`🔐 Crypto-Service running on port ${config.port}`);
    console.log(`📋 Endpoints: POST /encrypt, /decrypt, /mac/generate, /pin/encode, /cvv/generate`);
});

export default app;
