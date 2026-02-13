import { randomUUID } from 'node:crypto';

interface HsmSession {
    id: string;
    commandCode: string;
    createdAt: number;
    finishedAt?: number;
}

export class SessionManager {
    private readonly sessions: Map<string, HsmSession> = new Map();
    private readonly ttlMs: number;

    constructor(ttlMs: number = 5 * 60 * 1000) {
        this.ttlMs = ttlMs;
    }

    createSession(commandCode: string): HsmSession {
        this.cleanupExpired();
        const session: HsmSession = {
            id: randomUUID(),
            commandCode,
            createdAt: Date.now(),
        };
        this.sessions.set(session.id, session);
        return session;
    }

    closeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.finishedAt = Date.now();
        this.sessions.set(sessionId, session);
    }

    cleanupExpired(): void {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            const reference = session.finishedAt ?? session.createdAt;
            if (now - reference > this.ttlMs) {
                this.sessions.delete(id);
            }
        }
    }

    getActiveCount(): number {
        this.cleanupExpired();
        let active = 0;
        for (const session of this.sessions.values()) {
            if (!session.finishedAt) {
                active++;
            }
        }
        return active;
    }
}
