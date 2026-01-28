/**
 * Routes API pour les analytics pédagogiques
 */

import { Router, Request, Response } from 'express';
import { metricsService } from '../index.js';

const router = Router();

// Données simulées pour les analytics pédagogiques
const studentProgressData = [
    { studentId: 'STU001', name: 'Alice Martin', completedWorkshops: 12, score: 85, lastActive: '2026-01-28' },
    { studentId: 'STU002', name: 'Bob Dupont', completedWorkshops: 10, score: 78, lastActive: '2026-01-27' },
    { studentId: 'STU003', name: 'Claire Bernard', completedWorkshops: 14, score: 92, lastActive: '2026-01-28' },
    { studentId: 'STU004', name: 'David Leroy', completedWorkshops: 8, score: 65, lastActive: '2026-01-26' },
    { studentId: 'STU005', name: 'Emma Petit', completedWorkshops: 11, score: 88, lastActive: '2026-01-28' }
];

const workshopProgress = [
    { workshop: 'Atelier 01 - Flux Transaction', completion: 95, avgScore: 82 },
    { workshop: 'Atelier 02 - PIN Block', completion: 88, avgScore: 75 },
    { workshop: 'Atelier 03 - Replay Attack', completion: 82, avgScore: 70 },
    { workshop: 'Atelier 04 - Fraud Detection', completion: 78, avgScore: 72 },
    { workshop: 'Atelier 05 - Key Management', completion: 65, avgScore: 68 },
    { workshop: 'Atelier 06 - ISO 8583', completion: 72, avgScore: 74 },
    { workshop: 'Atelier 07 - MAC Integrity', completion: 68, avgScore: 71 },
    { workshop: 'Atelier 08 - Decline Scenarios', completion: 85, avgScore: 80 },
    { workshop: 'Atelier 09 - Audit Logging', completion: 80, avgScore: 78 },
    { workshop: 'Atelier 10 - Challenge Final', completion: 45, avgScore: 65 },
    { workshop: 'Atelier 11 - CVV', completion: 60, avgScore: 73 },
    { workshop: 'Atelier 12 - 3D Secure', completion: 55, avgScore: 70 },
    { workshop: 'Atelier 13 - Tokenisation', completion: 50, avgScore: 69 },
    { workshop: 'Atelier 14 - PCI-DSS', completion: 52, avgScore: 72 },
    { workshop: 'Atelier 15 - Security Attacks', completion: 35, avgScore: 68 }
];

const commonErrors = [
    { error: 'MAC calculation incorrect', count: 45, workshop: 'Atelier 07', severity: 'high' },
    { error: 'PIN Block format error', count: 38, workshop: 'Atelier 02', severity: 'medium' },
    { error: 'Key rotation not implemented', count: 32, workshop: 'Atelier 05', severity: 'high' },
    { error: 'ISO 8583 parsing failure', count: 28, workshop: 'Atelier 06', severity: 'medium' },
    { error: 'Missing response code validation', count: 25, workshop: 'Atelier 08', severity: 'low' },
    { error: 'DUKPT derivation error', count: 22, workshop: 'Atelier 05', severity: 'high' },
    { error: 'CVV validation skipped', count: 20, workshop: 'Atelier 11', severity: 'medium' },
    { error: 'Rate limiting not applied', count: 18, workshop: 'Atelier 15', severity: 'high' },
    { error: 'PAN masking incomplete', count: 15, workshop: 'Atelier 14', severity: 'critical' },
    { error: 'Replay attack vulnerability', count: 12, workshop: 'Atelier 03', severity: 'critical' }
];

// GET /api/analytics/fraud - Heatmap des fraudes détectées
router.get('/fraud', async (req: Request, res: Response) => {
    try {
        const fraudMetrics = metricsService.getFraudMetrics();

        // Transformer en format heatmap
        const heatmapData = generateFraudHeatmap();

        res.json({
            success: true,
            data: {
                metrics: fraudMetrics,
                heatmap: heatmapData
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch fraud analytics'
        });
    }
});

// GET /api/analytics/students - Progression des étudiants
router.get('/students', async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            data: {
                students: studentProgressData,
                summary: {
                    totalStudents: studentProgressData.length,
                    avgCompletion: studentProgressData.reduce((sum, s) => sum + s.completedWorkshops, 0) / studentProgressData.length,
                    avgScore: studentProgressData.reduce((sum, s) => sum + s.score, 0) / studentProgressData.length,
                    topPerformer: studentProgressData.reduce((max, s) => s.score > max.score ? s : max)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch student analytics'
        });
    }
});

// GET /api/analytics/workshops - Progression par atelier
router.get('/workshops', async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            data: {
                workshops: workshopProgress,
                summary: {
                    totalWorkshops: workshopProgress.length,
                    avgCompletion: workshopProgress.reduce((sum, w) => sum + w.completion, 0) / workshopProgress.length,
                    avgScore: workshopProgress.reduce((sum, w) => sum + w.avgScore, 0) / workshopProgress.length,
                    mostDifficult: workshopProgress.reduce((min, w) => w.avgScore < min.avgScore ? w : min),
                    mostPopular: workshopProgress.reduce((max, w) => w.completion > max.completion ? w : max)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workshop analytics'
        });
    }
});

// GET /api/analytics/errors - Analyse des erreurs courantes
router.get('/errors', async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            data: {
                errors: commonErrors,
                summary: {
                    totalErrors: commonErrors.reduce((sum, e) => sum + e.count, 0),
                    criticalCount: commonErrors.filter(e => e.severity === 'critical').length,
                    highCount: commonErrors.filter(e => e.severity === 'high').length,
                    topError: commonErrors[0]
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch error analytics'
        });
    }
});

// GET /api/analytics/suggestions - Suggestions d'amélioration
router.get('/suggestions', async (req: Request, res: Response) => {
    try {
        const suggestions = generateSuggestions();
        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate suggestions'
        });
    }
});

// Fonctions helper

function generateFraudHeatmap(): object {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const fraudTypes = ['mitm', 'replay', 'dos', 'pan_harvest', 'brute_force'];

    const heatmapData: any[] = [];

    for (const day of days) {
        for (const hour of hours) {
            for (const type of fraudTypes) {
                heatmapData.push({
                    day,
                    hour,
                    type,
                    value: Math.floor(Math.random() * 100)
                });
            }
        }
    }

    return {
        byTime: heatmapData,
        byType: fraudTypes.map(type => ({
            type,
            total: Math.floor(Math.random() * 500) + 50,
            trend: Math.random() > 0.5 ? 'up' : 'down'
        }))
    };
}

function generateSuggestions(): object[] {
    return [
        {
            id: 1,
            priority: 'high',
            category: 'security',
            title: 'Renforcer la validation MAC',
            description: '45 erreurs de calcul MAC détectées cette semaine. Recommandation: ajouter des exercices supplémentaires sur l\'algorithme ISO 9797.',
            workshop: 'Atelier 07',
            impact: 'Amélioration attendue: +15% de réussite'
        },
        {
            id: 2,
            priority: 'medium',
            category: 'learning',
            title: 'Simplifier l\'Atelier 05',
            description: 'Taux de complétion de 65% seulement. Recommandation: diviser en 2 sous-ateliers (rotation de clés + DUKPT).',
            workshop: 'Atelier 05',
            impact: 'Amélioration attendue: +20% de complétion'
        },
        {
            id: 3,
            priority: 'high',
            category: 'compliance',
            title: 'Insister sur le masking PAN',
            description: '15 violations PCI-DSS détectées. Recommandation: exercice obligatoire de validation avant passage à l\'atelier suivant.',
            workshop: 'Atelier 14',
            impact: 'Conformité PCI-DSS: 100%'
        },
        {
            id: 4,
            priority: 'low',
            category: 'engagement',
            title: 'Ajouter des challenges bonus',
            description: 'Les étudiants avancés terminent rapidement. Recommandation: ajouter des challenges "Expert" optionnels.',
            workshop: 'Tous',
            impact: 'Engagement: +25%'
        }
    ];
}

export default router;
