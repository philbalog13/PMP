import net, { Server, Socket } from 'net';
import { HSMSimulator } from '../core/HSMSimulator';
import { VulnEngine } from '../services/VulnEngine';

type PkcsRequestPayload = {
    studentId?: string;
    keyLabel?: string;
    mode?: string;
    data?: string;
};

export class Pkcs11TcpServer {
    private server: Server | null = null;
    private sessionCounter = 1;
    private keyHandleCounter = 1000;

    constructor(private readonly hsm: HSMSimulator) {}

    start(port = 5959): void {
        if (this.server) {
            return;
        }

        this.server = net.createServer((socket) => this.handleConnection(socket));
        this.server.listen(port, '0.0.0.0', () => {
            // eslint-disable-next-line no-console
            console.log(`[PKCS11] Simplified TCP server listening on port ${port}`);
        });
        this.server.on('error', (error) => {
            // eslint-disable-next-line no-console
            console.error('[PKCS11] Server error:', (error as Error).message);
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = null;
                resolve();
            });
        });
    }

    private handleConnection(socket: Socket): void {
        let buffer = Buffer.alloc(0);

        socket.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.length >= 8) {
                const functionCode = buffer.readUInt32BE(0);
                const payloadLen = buffer.readUInt32BE(4);
                if (buffer.length < 8 + payloadLen) {
                    break;
                }

                const payloadRaw = buffer.subarray(8, 8 + payloadLen);
                buffer = buffer.subarray(8 + payloadLen);
                const request = this.parsePayload(payloadRaw);
                const response = this.process(functionCode, request);
                this.writeResponse(socket, functionCode, response);
            }
        });

        socket.on('error', (error) => {
            // eslint-disable-next-line no-console
            console.warn('[PKCS11] Socket error:', error.message);
        });
    }

    private parsePayload(payload: Buffer): PkcsRequestPayload {
        if (payload.length === 0) {
            return {};
        }

        try {
            return JSON.parse(payload.toString('utf8')) as PkcsRequestPayload;
        } catch {
            return { data: payload.toString('utf8') };
        }
    }

    private writeResponse(socket: Socket, functionCode: number, payload: Record<string, unknown>): void {
        const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
        const frame = Buffer.alloc(8 + payloadBuffer.length);
        frame.writeUInt32BE(functionCode, 0);
        frame.writeUInt32BE(payloadBuffer.length, 4);
        payloadBuffer.copy(frame, 8);
        socket.write(frame);
    }

    private process(functionCode: number, payload: PkcsRequestPayload): Record<string, unknown> {
        const studentId = payload.studentId || '';
        switch (functionCode) {
            case 0x0001:
                return {
                    success: true,
                    function: 'C_GetSlotList',
                    slots: [{ slotId: 0, tokenLabel: 'PMP-HSM-SLOT-0' }],
                    // HSM-001 variant: unauthenticated slot enumeration information leak.
                    ...(studentId ? { flag: VulnEngine.generateFlag(studentId, 'HSM-001') } : {}),
                };

            case 0x0003:
                this.sessionCounter += 1;
                return {
                    success: true,
                    function: 'C_OpenSession',
                    sessionHandle: this.sessionCounter,
                };

            case 0x0004:
                return {
                    success: true,
                    function: 'C_FindObjects',
                    // KEY-002 variant style: no auth gate, full key list dump.
                    objects: this.hsm.keyStorage.listKeys().map((key) => ({
                        label: key.label,
                        type: key.type,
                        value: key.value,
                    })),
                };

            case 0x0005: {
                const keyLabel = String(payload.keyLabel || 'DEK_AES_001').toUpperCase();
                const mode = String(payload.mode || 'ECB').toUpperCase();
                const plain = String(payload.data || '');
                const key = this.hsm.keyStorage.getKey(keyLabel);
                return {
                    success: true,
                    function: 'C_Encrypt',
                    keyLabel,
                    mode,
                    ciphertext: Buffer.from(`${mode}:${key?.value || 'NO_KEY'}:${plain}`).toString('base64'),
                    note: 'ECB is intentionally available for educational vulnerability labs',
                };
            }

            case 0x0006:
                // CRYPTO-001 variant: predictable sequential key handles.
                this.keyHandleCounter += 1;
                return {
                    success: true,
                    function: 'C_GenerateKey',
                    keyHandle: this.keyHandleCounter,
                    note: 'Predictable key handle sequence',
                };

            default:
                return {
                    success: false,
                    error: 'Unsupported function code',
                    functionCode,
                };
        }
    }
}
