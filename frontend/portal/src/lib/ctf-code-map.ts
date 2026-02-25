const ACTIVE_ROOM_CODES = ['PAY-001', 'PCI-001', 'SOC-001', 'API-001', 'DORA-001'] as const;
const ACTIVE_ROOM_CODE_SET = new Set<string>(ACTIVE_ROOM_CODES);

export const FIRST_CTF_ROOM_CODE = 'PAY-001';

export function normalizeCtfCode(value: unknown): string {
    return String(value || '').trim().toUpperCase();
}

export function isActiveCtfRoomCode(value: unknown): boolean {
    return ACTIVE_ROOM_CODE_SET.has(normalizeCtfCode(value));
}

