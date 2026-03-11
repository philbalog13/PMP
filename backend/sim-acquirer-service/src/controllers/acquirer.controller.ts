import { Request, Response } from 'express';
import axios from 'axios';
import * as acquirerService from '../services/acquirer.service';
import * as merchantService from '../services/merchant.service';
import { config } from '../config';

export const processTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await acquirerService.processTransaction(req.body);

        res.json({
            success: result.approved,
            ...result,
            _educational: {
                acquirerRole: 'The acquirer is the merchant\'s bank that processes card payments',
                flow: [
                    '1. Receive transaction from POS',
                    '2. Validate merchant',
                    '3. Format ISO 8583 message',
                    '4. Route to payment network',
                    '5. Return authorization response'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Processing failed' });
    }
};

export const getAllMerchants = (req: Request, res: Response): void => {
    res.json({ success: true, data: merchantService.getAllMerchants() });
};

export const getMerchant = (req: Request, res: Response): void => {
    const merchant = merchantService.getMerchant(req.params.id);
    if (!merchant) {
        res.status(404).json({ success: false, error: 'Merchant not found' });
        return;
    }
    res.json({ success: true, data: merchant });
};

export const createMerchant = (req: Request, res: Response): void => {
    const { name, mcc, address, city, country } = req.body;
    if (!name || !mcc) {
        res.status(400).json({ success: false, error: 'name and mcc are required' });
        return;
    }
    const merchant = merchantService.createMerchant({
        name, mcc, address: address || '', city: city || '', country: country || 'FR', status: 'ACTIVE'
    });
    res.status(201).json({ success: true, data: merchant });
};

/**
 * Cold Boot / NAC: derive a Zone PIN Key (ZPK) for a POS terminal.
 * Routes through sim-network-switch → hsm-simulator.
 * Flow: POS → Acquirer (here) → NetworkSwitch → HSM
 */
export const keyExchange = async (req: Request, res: Response): Promise<void> => {
    const { terminalId, timestamp } = req.body as { terminalId?: string; timestamp?: string };
    if (!terminalId) {
        res.status(400).json({ success: false, error: 'terminalId is required' });
        return;
    }

    try {
        console.log(`[ACQUIRER] Cold Boot key-exchange requested by terminal ${terminalId}`);
        const switchResponse = await axios.post(
            `${config.networkSwitch.url}/transaction/key-exchange`,
            { terminalId, sessionId: `SID_${Date.now()}` },
            { timeout: 8000 }
        );
        res.json({
            success: true,
            data: switchResponse.data?.data,
            _educational: {
                role: 'Acquéreur (Banque du commerçant)',
                description: 'L\'acquéreur relaie la demande N.A.C du TPE vers le réseau monétique',
                flow: 'TPE → Acquéreur → Switch (vlan-acquereur) → HSM (vlan-emetteur)'
            }
        });
    } catch (error: any) {
        console.error(`[ACQUIRER] key-exchange error:`, error.message);
        res.status(503).json({ success: false, error: 'Key exchange failed: ' + error.message });
    }
};

/**
 * Télécollecte: submit end-of-day batch to the clearing engine.
 * Receives approved transactions from the POS and forwards to sim-clearing-engine.
 */
export const telecollecte = async (req: Request, res: Response): Promise<void> => {
    const { terminalId, merchantId, transactions, fromDate } = req.body as {
        terminalId: string;
        merchantId: string;
        transactions: any[];
        fromDate?: string;
    };

    if (!terminalId || !merchantId) {
        res.status(400).json({ success: false, error: 'terminalId and merchantId are required' });
        return;
    }

    // Build transactions list: use provided list or use in-memory (if available)
    const txnList = Array.isArray(transactions) && transactions.length > 0
        ? transactions
        : [];

    if (txnList.length === 0) {
        res.json({
            success: true,
            data: {
                batchId: null,
                status: 'EMPTY',
                message: 'No transactions to submit',
                transactionCount: 0
            }
        });
        return;
    }

    try {
        console.log(`[ACQUIRER] Télécollecte: ${txnList.length} transactions for terminal ${terminalId}`);
        const clearingResponse = await axios.post(
            `${config.clearingEngine.url}/clearing/batch`,
            { terminalId, merchantId, transactions: txnList },
            { timeout: 30000 }
        );
        res.json({
            success: true,
            data: clearingResponse.data?.data,
            _educational: {
                description: 'Télécollecte: envoi du lot transactionnel de fin de journée',
                isoFlow: 'ISO 8583 TC33 — Batch submission from POS to Acquirer to Clearing Engine',
                nextStep: 'Le moteur de compensation reconcilie les autorisations avec les règlements'
            }
        });
    } catch (error: any) {
        console.error(`[ACQUIRER] telecollecte error:`, error.message);
        res.status(503).json({ success: false, error: 'Clearing engine unavailable: ' + error.message });
    }
};
