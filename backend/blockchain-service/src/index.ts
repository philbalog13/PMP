import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8008;

app.use(cors());
app.use(express.json());

// Ledger storage (in-memory simulation)
const ledger: any[] = [];

app.post('/ledger/log', (req, res) => {
    const { data, type } = req.body;
    console.log(`[BLOCKCHAIN] Logging new block: ${type}`);

    const block = {
        index: ledger.length + 1,
        timestamp: new Date().toISOString(),
        data,
        type,
        hash: Math.random().toString(36).substring(2, 15) // Simulation of hash
    };

    ledger.push(block);
    console.log(`[BLOCKCHAIN] Block #${block.index} added. Hash: ${block.hash}`);

    res.json({ success: true, block });
});

app.get('/ledger', (_req, res) => {
    res.json(ledger);
});

app.listen(PORT, () => {
    console.log(`Blockchain Service (Mock) running on port ${PORT}`);
});
