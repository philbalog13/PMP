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
app.post('/acs/areq', acsController.areq);
app.post('/acs/creq', acsController.creq);
app.post('/ds/rreq', acsController.rreq);

// Legacy CTF compatibility aliases (/acs/*)
app.post('/acs/authenticate', acsController.authenticate);
app.post('/acs/challenge', (req, res) => {
    const acsTransId = req.body?.challengeId || `ACS_${Date.now()}`;
    res.json({
        challengeId: acsTransId,
        acsTransId,
        status: 'CHALLENGE_REQUIRED',
        message: 'OTP challenge generated'
    });
});
app.post('/acs/verify-otp', async (req, res) => {
    try {
        const acsTransId = req.body?.challengeId || req.body?.acsTransId || req.body?.threeDSServerTransID || `ACS_${Date.now()}`;
        const otp = String(req.body?.otp || '');
        const studentId = req.headers['x-student-id'] as string | undefined;
        const payload = acsController.evaluateCreq(acsTransId, otp, studentId);
        const transStatus = String((payload as any).transStatus || 'N');
        res.json({
            ...payload,
            status: transStatus === 'Y' ? 'SUCCESS' : 'FAILED',
            challengeId: acsTransId
        });
    } catch (error: any) {
        res.status(500).json({ status: 'FAILED', error: error.message || 'Verification error' });
    }
});
app.post('/acs/risk-check', (req, res) => {
    const amount = Number(req.body?.amount || 0);
    const scaRequired = amount >= 500;
    res.json({
        scaRequired,
        threshold: 500,
        status: scaRequired ? 'CHALLENGE_REQUIRED' : 'FRICTIONLESS'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'acs-simulator', version: '2.2.0' });
});

app.listen(PORT, () => {
    console.log(`🔐 3DS ACS Simulator (v2.2.0) running on port ${PORT}`);
});
