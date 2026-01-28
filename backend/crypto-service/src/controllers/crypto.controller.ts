import { Request, Response } from 'express';
import * as cryptoService from '../services/crypto.service';

export const encrypt = (req: Request, res: Response): void => {
    const { data, key, algorithm } = req.body;

    if (!data || !key) {
        res.status(400).json({ success: false, error: 'data and key are required' });
        return;
    }

    const result = cryptoService.encrypt(data, key, algorithm);
    res.json({
        ...result,
        _educational: {
            note: 'Symmetric encryption transforms plaintext to ciphertext',
            securityTip: 'Never transmit encryption keys over the same channel as data'
        }
    });
};

export const decrypt = (req: Request, res: Response): void => {
    const { data, key, algorithm } = req.body;

    if (!data || !key) {
        res.status(400).json({ success: false, error: 'data and key are required' });
        return;
    }

    const result = cryptoService.decrypt(data, key, algorithm);
    res.json(result);
};

export const generateMac = (req: Request, res: Response): void => {
    const { data, key, algorithm } = req.body;

    if (!data || !key) {
        res.status(400).json({ success: false, error: 'data and key are required' });
        return;
    }

    const result = cryptoService.generateMac(data, key, algorithm);
    res.json({
        ...result,
        _educational: {
            purpose: 'MAC ensures data integrity and authenticity',
            usage: 'Attach MAC to messages to detect tampering'
        }
    });
};

export const verifyMac = (req: Request, res: Response): void => {
    const { data, mac, key, algorithm } = req.body;

    if (!data || !mac || !key) {
        res.status(400).json({ success: false, error: 'data, mac, and key are required' });
        return;
    }

    const result = cryptoService.verifyMac(data, mac, key, algorithm);
    res.json(result);
};

export const generatePinBlock = (req: Request, res: Response): void => {
    const { pin, pan, format } = req.body;

    if (!pin || !pan) {
        res.status(400).json({ success: false, error: 'pin and pan are required' });
        return;
    }

    const result = cryptoService.generatePinBlock(pin, pan, format || 0);
    res.json({
        ...result,
        _educational: {
            standard: 'ISO 9564 (PIN Block Formats)',
            purpose: 'Securely encode PIN with PAN for transmission',
            formats: {
                0: 'PIN XOR PAN (most common)',
                1: 'PIN with random padding',
                3: 'PIN with random fill'
            }
        }
    });
};

export const generateCvv = (req: Request, res: Response): void => {
    const { pan, expiry, serviceCode, key } = req.body;

    if (!pan || !expiry) {
        res.status(400).json({ success: false, error: 'pan and expiry are required' });
        return;
    }

    const result = cryptoService.generateCvv(pan, expiry, serviceCode || '101', key || 'TESTCVK1234567890ABCDEF');
    res.json({
        ...result,
        _educational: {
            purpose: 'CVV/CVC verifies card is physically present',
            note: 'Real CVV uses proprietary bank algorithms'
        }
    });
};
