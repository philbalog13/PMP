"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISO8583Formatter = void 0;
class ISO8583Formatter {
    parse(message) {
        const steps = [];
        // Stub implementation for ISO8583 parsing
        // In full impl, would parse MTI, Bitmap, Fields
        steps.push({
            name: 'Parse ISO8583',
            description: 'Parse raw buffer',
            input: message.toString('hex'),
            output: 'Parsed Data Object'
        });
        return { result: { mti: '0100' }, steps };
    }
}
exports.ISO8583Formatter = ISO8583Formatter;
