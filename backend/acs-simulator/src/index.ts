/**
 * 3D-Secure ACS (Access Control Server) Simulator
 * Performs cardholder authentication
 */

import express from 'express';
import cors from 'cors';
import { ACSController } from './controllers/ACSController';

const app = express();
const PORT = process.env.PORT || 8013;

app.use(cors());
app.use(express.json());

// Initialize controller
const acsController = new ACSController();

// Routes
app.post('/authenticate', acsController.authenticate);
app.post('/challenge/verify', acsController.verifyChallenge);
app.post('/ares', acsController.sendARes);
app.get('/challenge', acsController.getChallengeUrl);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'acs-simulator', version: '2.2.0' });
});

app.listen(PORT, () => {
    console.log(`🔐 3DS ACS Simulator (v2.2.0) running on port ${PORT}`);
});
