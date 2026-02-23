export interface Iso8583Message {
    mti: string;
    de2?: string;
    de4?: string;
    de11?: string;
    de43?: string;
    de63?: string;
    de64?: string;
    raw: string;
}

export class MessageParser {
    static parse(payload: Buffer): Iso8583Message {
        const raw = payload.toString('utf8').trim();
        if (!raw) {
            throw new Error('Empty ISO8583 payload');
        }

        if (raw.startsWith('{')) {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            return {
                mti: String(parsed.mti || ''),
                de2: parsed.de2 ? String(parsed.de2) : undefined,
                de4: parsed.de4 ? String(parsed.de4) : undefined,
                de11: parsed.de11 ? String(parsed.de11) : undefined,
                de43: parsed.de43 ? String(parsed.de43) : undefined,
                de63: parsed.de63 ? String(parsed.de63) : undefined,
                de64: parsed.de64 ? String(parsed.de64) : undefined,
                raw,
            };
        }

        // Fallback educational format: MTI|DE2|DE4|DE11|DE43|DE64|DE63
        const parts = raw.split('|');
        return {
            mti: String(parts[0] || ''),
            de2: parts[1] || undefined,
            de4: parts[2] || undefined,
            de11: parts[3] || undefined,
            de43: parts[4] || undefined,
            de64: parts[5] || undefined,
            de63: parts[6] || undefined,
            raw,
        };
    }

    static encode(payload: Record<string, unknown>): Buffer {
        return Buffer.from(JSON.stringify(payload), 'utf8');
    }

    static parseStudentIdFromDe63(de63?: string): string | null {
        if (!de63) {
            return null;
        }

        const direct = /^studentId[:=]([A-Za-z0-9_-]+)$/i.exec(de63.trim());
        if (direct) {
            return direct[1];
        }

        if (de63.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(de63) as Record<string, unknown>;
                if (parsed.studentId) {
                    return String(parsed.studentId);
                }
            } catch {
                return null;
            }
        }

        return null;
    }
}
