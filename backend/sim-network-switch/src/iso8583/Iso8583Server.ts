import net, { Server, Socket } from 'net';
import { generateFlag } from '../ctfFlag';
import { logger } from '../utils/logger';
import { Iso8583Message, MessageParser } from './MessageParser';

export class Iso8583TcpServer {
    private server: Server | null = null;

    start(port = 8583): void {
        if (this.server) {
            return;
        }

        this.server = net.createServer((socket) => this.handleConnection(socket));
        this.server.listen(port, '0.0.0.0', () => {
            logger.info('[ISO8583] TCP server listening', { port });
        });
        this.server.on('error', (error) => {
            logger.error('[ISO8583] TCP server error', { error: (error as Error).message });
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

        socket.on('data', (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.length >= 2) {
                const frameLength = buffer.readUInt16BE(0);
                if (buffer.length < frameLength + 2) {
                    break;
                }

                const payload = buffer.subarray(2, 2 + frameLength);
                buffer = buffer.subarray(2 + frameLength);

                try {
                    const parsed = MessageParser.parse(payload);
                    const response = this.processMessage(parsed);
                    this.writeFrame(socket, MessageParser.encode(response));
                } catch (error: any) {
                    const response = {
                        success: false,
                        error: error.message || 'Invalid ISO8583 message',
                        responseCode: '96',
                    };
                    this.writeFrame(socket, MessageParser.encode(response));
                }
            }
        });

        socket.on('error', (error) => {
            logger.warn('[ISO8583] Client socket error', { error: error.message });
        });
    }

    private writeFrame(socket: Socket, payload: Buffer): void {
        const frame = Buffer.alloc(payload.length + 2);
        frame.writeUInt16BE(payload.length, 0);
        payload.copy(frame, 2);
        socket.write(frame);
    }

    private processMessage(message: Iso8583Message): Record<string, unknown> {
        const notes: string[] = [];
        const flags: string[] = [];
        const studentId = MessageParser.parseStudentIdFromDe63(message.de63);

        // NET-003: Accept MTI 0110 (response) as if it were a request.
        if (message.mti === '0110') {
            notes.push('NET-003 vulnerability: response MTI accepted as inbound request');
            if (studentId) {
                const flag = generateFlag(studentId, 'NET-003');
                if (flag) flags.push(flag);
            }
        }

        // NET-004: Predictable STAN allows forged reversal 0420.
        if (message.mti === '0420') {
            notes.push('NET-004 vulnerability: forged reversal accepted with predictable STAN');
            if (studentId) {
                const flag = generateFlag(studentId, 'NET-004');
                if (flag) flags.push(flag);
            }
        }

        // NET-005: 0100 accepted even without DE64 MAC.
        if (message.mti === '0100' && !message.de64) {
            notes.push('NET-005 vulnerability: message accepted without DE64 MAC');
            if (studentId) {
                const flag = generateFlag(studentId, 'NET-005');
                if (flag) flags.push(flag);
            }
        }

        const responseMti = message.mti === '0800'
            ? '0810'
            : message.mti === '0200'
                ? '0210'
                : message.mti === '0420'
                    ? '0430'
                    : '0110';

        return {
            success: true,
            accepted: true,
            requestMti: message.mti,
            responseMti,
            responseCode: '00',
            echo: {
                de2: message.de2 || null,
                de4: message.de4 || null,
                de11: message.de11 || null,
                de43: message.de43 || null,
                de63: message.de63 || null,
                de64Present: Boolean(message.de64),
            },
            notes,
            ...(flags.length > 0 ? { flags } : {}),
        };
    }
}
