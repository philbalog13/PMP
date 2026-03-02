import { Request, Response } from 'express';
import { PKIService } from '../services/pki.service';

export const getRootCA = (req: Request, res: Response): void => {
    try {
        const pkiService = PKIService.getInstance();
        const certPem = pkiService.getRootCACertificate();

        res.json({
            success: true,
            data: {
                certificate: certPem
            },
            _educational: {
                role: 'Root CA (Autorité de Certification)',
                description: 'This is the public certificate of the MoneTIC PMP internal PKI.',
                usage: 'Used by terminals (POS/GAB) to verify the authenticity of inserted EMV cards.'
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateCertificate = (req: Request, res: Response): void => {
    try {
        const { subjectCN, isEMVCard } = req.body;

        if (!subjectCN) {
            res.status(400).json({ success: false, error: 'subjectCN is required' });
            return;
        }

        const pkiService = PKIService.getInstance();
        const certData = pkiService.generateEntityCertificate(subjectCN, isEMVCard || false);

        res.status(201).json({
            success: true,
            data: certData,
            _educational: {
                role: isEMVCard ? 'EMV Card Certificate (SDA/DDA)' : 'Microservice mTLS Certificate',
                description: 'A newly generated certificate signed by the MoneTIC Root CA.',
                securityNote: 'Private key is returned here for simulation purposes ONLY. In reality, card private keys are generated inside the smartcard crypto-processor.'
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
