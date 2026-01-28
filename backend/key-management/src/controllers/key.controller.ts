import { Request, Response } from 'express';
import * as keyService from '../services/key.service';

export const generateKey = (req: Request, res: Response): void => {
    const { name, type, algorithm } = req.body;

    if (!name || !type) {
        res.status(400).json({ success: false, error: 'name and type are required' });
        return;
    }

    const key = keyService.generateKey(name, type, algorithm || 'AES-256');

    res.status(201).json({
        success: true,
        data: {
            id: key.id,
            name: key.name,
            type: key.type,
            algorithm: key.algorithm,
            kcv: key.kcv,
            status: key.status,
            createdAt: key.createdAt
            // keyData is NOT returned for security
        },
        _educational: {
            kcvExplanation: 'Key Check Value - first 6 hex chars of encrypting zeros with the key',
            keyTypes: {
                ZMK: 'Zone Master Key - encrypts keys during exchange',
                TMK: 'Terminal Master Key - unique per terminal',
                ZPK: 'Zone PIN Key - encrypts PIN blocks',
                PVK: 'PIN Verification Key - verifies PINs',
                CVK: 'Card Verification Key - generates CVV',
                KEK: 'Key Encrypting Key - protects other keys',
                DEK: 'Data Encrypting Key - encrypts data',
                MAC: 'Message Authentication Code Key'
            }
        }
    });
};

export const getAllKeys = (req: Request, res: Response): void => {
    res.json({ success: true, data: keyService.getAllKeys() });
};

export const getKey = (req: Request, res: Response): void => {
    const key = keyService.getKey(req.params.id);
    if (!key) {
        res.status(404).json({ success: false, error: 'Key not found' });
        return;
    }
    res.json({ success: true, data: key });
};

export const deleteKey = (req: Request, res: Response): void => {
    const deleted = keyService.deleteKey(req.params.id);
    if (!deleted) {
        res.status(404).json({ success: false, error: 'Key not found' });
        return;
    }
    res.json({ success: true, message: 'Key destroyed (zeroized)' });
};

export const rotateKey = (req: Request, res: Response): void => {
    const newKey = keyService.rotateKey(req.params.id);
    if (!newKey) {
        res.status(404).json({ success: false, error: 'Key not found' });
        return;
    }

    res.json({
        success: true,
        data: {
            newKeyId: newKey.id,
            kcv: newKey.kcv,
            rotatedFrom: req.params.id
        },
        _educational: {
            rotationPurpose: 'Key rotation limits the impact of potential key compromise',
            bestPractice: 'Rotate keys regularly (e.g., annually or after suspected breach)'
        }
    });
};

export const importKey = (req: Request, res: Response): void => {
    const { name, type, algorithm, keyData } = req.body;

    if (!name || !type || !keyData) {
        res.status(400).json({ success: false, error: 'name, type, and keyData are required' });
        return;
    }

    const key = keyService.importKey(name, type, algorithm || 'AES-256', keyData);
    res.status(201).json({
        success: true,
        data: {
            id: key.id,
            kcv: key.kcv,
            status: key.status
        }
    });
};

export const exportKey = (req: Request, res: Response): void => {
    const result = keyService.exportKey(req.params.id, req.body.kekId);
    if (!result) {
        res.status(404).json({ success: false, error: 'Key not found or not active' });
        return;
    }

    res.json({
        success: true,
        data: result,
        _educational: {
            warning: 'In production, keys should be exported encrypted under a KEK',
            securityNote: 'This educational version returns clear key for learning purposes only'
        }
    });
};
