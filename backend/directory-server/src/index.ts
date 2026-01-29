/**
 * 3D-Secure Directory Server
 * Routes authentication requests to appropriate ACS
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8087;

app.use(cors());
app.use(express.json());

// BIN to ACS mapping (simplified)
const binToAcs: Record<string, string> = {
    '411111': 'http://acs-simulator:8088',  // Visa test BIN
    '550000': 'http://acs-simulator:8088',  // Mastercard test BIN
};

interface AuthRequest {
    pan: string;
    amount: number;
    merchantId: string;
    transactionId: string;
}

/**
 * POST /3ds/authenticate
 * Entry point for 3DS authentication
 */
app.post('/3ds/authenticate', async (req, res) => {
    try {
        const authReq: AuthRequest = req.body;
        const bin = authReq.pan.substring(0, 6);

        // Route to ACS
        const acsUrl = binToAcs[bin];
        if (!acsUrl) {
            return res.status(404).json({
                error: 'No ACS found for this BIN',
                transStatus: 'N'  // Not authenticated
            });
        }

        console.log(`🔀 Routing to ACS: ${acsUrl}`);

        // Forward to ACS
        const acsResponse = await axios.post(`${acsUrl}/authenticate`, authReq, {
            timeout: 10000
        });

        res.json(acsResponse.data);
    } catch (error: any) {
        console.error('Directory Server error:', error.message);
        res.status(500).json({
            error: 'Authentication failed',
            transStatus: 'U'  // Unable to authenticate
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'directory-server' });
});

app.listen(PORT, () => {
    console.log(`🔐 3DS Directory Server running on port ${PORT}`);
});
