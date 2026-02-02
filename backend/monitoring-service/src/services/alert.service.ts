
export interface Alert {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
    source: string;
}

export class AlertService {
    private alerts: Alert[] = [];

    triggerAlert(severity: 'info' | 'warning' | 'critical', message: string, source: string = 'System'): void {
        const alert: Alert = {
            id: Math.random().toString(36).substring(7),
            severity,
            message,
            timestamp: new Date(),
            source
        };

        this.alerts.push(alert);
        console.log(`[ALERT] [${severity.toUpperCase()}] ${source}: ${message}`);

        // Simulate sending notification to admin
        if (severity === 'critical') {
            this.notifyAdmin(alert);
        }
    }

    private notifyAdmin(alert: Alert): void {
        console.log(`[NOTIFY] Sending SMS/Email to Admin: ${alert.message}`);
    }

    getRecentAlerts(limit: number = 10): Alert[] {
        return this.alerts.slice(-limit).reverse();
    }
}

export const alertService = new AlertService();
